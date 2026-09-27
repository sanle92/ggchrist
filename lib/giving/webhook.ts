import "server-only";
import { stripeRequest } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { accessToken, hash, siteUrl } from "./server";
import { getApiSecret } from "@/lib/server-secrets";
import { money } from "./shared";
type Row = Record<string, any>;
const idOf = (v: any): string | undefined =>
  typeof v === "string" ? v : v?.id;
const api = (path: string) =>
  stripeRequest<Row>(path, {
    headers: { "Stripe-Version": "2025-06-30.basil" },
  });
const iso = (v: number | undefined) =>
  v ? new Date(v * 1000).toISOString() : null;
function invoiceUuid(id: string) {
  const h = hash(`giving:${id}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function processGivingEvent(event: Row): Promise<boolean> {
  const supported = [
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.processing",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "charge.refunded",
    "charge.updated",
  ];
  if (!supported.includes(event.type)) return false;
  const object = event.data.object;
  const db = createServiceClient();
  let subscription: Row | null = null,
    invoice: Row | null = null,
    intent: Row | null = null,
    base: Row | null = null;
  if (event.type.startsWith("customer.subscription."))
    subscription = await api(`/subscriptions/${object.id}`);
  else if (event.type.startsWith("invoice.")) {
    invoice = await api(
      `/invoices/${object.id}?expand[]=payments.data.payment.payment_intent`,
    );
    const subId =
      idOf(invoice.parent?.subscription_details?.subscription) ||
      idOf(invoice.subscription);
    if (!subId) return false;
    subscription = await api(`/subscriptions/${subId}`);
  } else if (event.type.startsWith("payment_intent.")) {
    if (object.metadata?.giving_version !== "2") return false;
    intent = await api(
      `/payment_intents/${object.id}?expand[]=latest_charge.balance_transaction`,
    );
  } else if (
    event.type === "charge.refunded" ||
    event.type === "charge.updated"
  ) {
    const pi = idOf(object.payment_intent);
    if (!pi) return false;
    intent = await api(
      `/payment_intents/${pi}?expand[]=latest_charge.balance_transaction`,
    );
    const { data, error } = await db
      .from("donations")
      .select("*")
      .eq("provider_transaction_id", pi)
      .maybeSingle();
    if (error) throw error;
    base = data;
    if (!base?.access_token_hash && intent.metadata?.giving_version !== "2")
      return false;
  } else return false;
  const meta = subscription?.metadata || intent?.metadata;
  if (!base && meta?.giving_version !== "2") return false;
  if (!base) {
    const { data, error } = await db
      .from("donations")
      .select("*")
      .eq("id", meta.donation_id)
      .single();
    if (error || !data)
      throw new Error(
        "Initialized gift missing; replay this event after recovery",
      );
    base = data;
  }
  let sub: Row | null = null;
  if (subscription) {
    sub = {
      stripe_event_created: event.created,
      id: base!.id,
      donor_name: base!.donor_name,
      donor_email: base!.donor_email,
      donor_phone: base!.donor_phone,
      campaign_id: base!.campaign_id,
      amount_minor: subscription.items.data[0].price.unit_amount,
      currency: subscription.currency.toUpperCase(),
      frequency: "monthly",
      status:
        subscription.status === "canceled" ? "cancelled" : subscription.status,
      stripe_customer_id: idOf(subscription.customer),
      stripe_subscription_id: subscription.id,
      purpose: base!.purpose,
      next_payment_at: iso(subscription.items.data[0].current_period_end),
      cancelled_at: iso(subscription.canceled_at),
    };
  }
  let donation: Row | null = null;
  if (invoice) {
    const payment =
      invoice.payments?.data?.find((p: Row) => p.status === "paid") ||
      invoice.payments?.data?.[0];
    const pi = idOf(payment?.payment?.payment_intent);
    if (pi)
      intent = await api(
        `/payment_intents/${pi}?expand[]=latest_charge.balance_transaction`,
      );
    if (
      invoice.status === "paid" &&
      (!intent ||
        intent.status !== "succeeded" ||
        intent.amount_received !== invoice.amount_paid ||
        invoice.amount_paid !== invoice.amount_due)
    ) {
      throw new Error(
        "Invoice does not have a matching confirmed Stripe card payment",
      );
    }
    const initial = invoice.billing_reason === "subscription_create";
    const id = initial ? base!.id : invoiceUuid(invoice.id);
    donation = {
      ...base,
      id,
      refunded_amount: 0,
      refunded_at: null,
      processing_fee: null,
      net_amount: null,
      fee_currency: null,
      provider_reference: initial ? base!.provider_reference : invoice.id,
      subscription_id: base!.id,
      stripe_subscription_id: subscription!.id,
      stripe_customer_id: idOf(subscription!.customer),
      stripe_invoice_id: invoice.id,
      access_token_hash: hash(await accessToken(id)),
      amount_minor: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status === "paid" ? "successful" : "failed",
      paid_at:
        invoice.status === "paid"
          ? iso(invoice.status_transitions.paid_at)
          : null,
    };
    if (
      !Number.isSafeInteger(donation.amount_minor) ||
      donation.amount_minor <= 0
    )
      return true;
    if (
      initial &&
      (donation.amount_minor !== base!.amount_minor ||
        donation.currency !== base!.currency)
    )
      throw new Error("Initial invoice amount mismatch");
  } else if (intent) {
    donation = {
      ...base,
      status:
        intent.status === "succeeded"
          ? "successful"
          : intent.status === "processing"
            ? "processing"
            : "failed",
      paid_at: intent.status === "succeeded" ? iso(intent.created) : null,
    };
    if (
      intent.amount !== base!.amount_minor ||
      intent.currency.toUpperCase() !== base!.currency
    )
      throw new Error("Payment amount mismatch");
  }
  if (donation && intent) {
    donation.provider_transaction_id = intent.id;
    const charge = intent.latest_charge;
    if (charge && typeof charge === "object") {
      donation.refunded_amount = charge.amount_refunded || 0;
      if (charge.refunded) donation.status = "refunded";
      if (charge.amount_refunded) donation.refunded_at = iso(event.created);
      const balance = charge.balance_transaction;
      if (balance && typeof balance === "object") {
        donation.processing_fee = balance.fee;
        donation.net_amount = balance.net;
        donation.fee_currency = balance.currency.toUpperCase();
      }
    }
  }
  const { error } = await db.rpc("apply_giving_event", {
    p_event_id: event.id,
    p_type: event.type,
    p_object_id: subscription?.id || intent?.id || object.id,
    p_donation: donation,
    p_subscription: sub,
  });
  if (error) throw error;
  if (donation?.status === "successful") await sendGivingReceipt(donation.id);
  return true;
}
export async function sendGivingReceipt(id: string) {
  const db = createServiceClient();
  const { data: d, error } = await db
    .from("donations")
    .select("*,campaigns(title)")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (d.email_sent_at || d.status !== "successful") return;
  const key = await getApiSecret("resend_api_key");
  const { data: settings } = await db
    .from("site_settings")
    .select("contact_email,site_name")
    .maybeSingle();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("Receipt email sender not configured");
  const { data: started, error: claimError } = await db.rpc(
    "begin_giving_email",
    { p_id: id },
  );
  if (claimError) throw claimError;
  if (!started) return;
  if (Date.now() - Date.parse(started) > 23 * 3600000)
    throw new Error(
      "Receipt email requires manual reconciliation before retrying beyond provider idempotency window",
    );
  const token = await accessToken(id);
  const receipt = `${siteUrl()}/api/giving/receipt?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `giving-receipt/${id}`,
    },
    body: JSON.stringify({
      from,
      to: [d.donor_email],
      subject: "Thank you for supporting Glorious Gospel of Christ",
      text: `Hello ${d.donor_name.split(" ")[0]},\n\n${d.frequency === "monthly" ? "Thank you for becoming a Monthly Partner." : "Thank you for supporting the work of the Gospel."}\n\nGift received: ${money(d.amount_minor, d.currency)}\nPurpose: ${d.purpose}\nCampaign: ${d.campaigns?.title || "General giving"}\nFrequency: ${d.frequency === "monthly" ? "Monthly" : "One-time"}\nReference: ${d.reference}\nReceipt: ${receipt}\n\n“God loveth a cheerful giver.” — 2 Corinthians 9:7\n\n${settings?.site_name || "Glorious Gospel of Christ"}\n${settings?.contact_email || siteUrl()}`,
    }),
  });
  if (!response.ok)
    throw new Error("Receipt delivery failed; webhook retry required");
  const { error: updateError } = await db
    .from("donations")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw updateError;
}
