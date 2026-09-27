import { validStripeSignature } from "@/lib/giving/signature";
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getApiSecret } from "@/lib/server-secrets";
import { createServiceClient } from "@/lib/supabase/service";

type StripeRecord = Record<string, any>;

export async function stripeRequest<T extends StripeRecord>(
  path: string,
  init: RequestInit = {},
) {
  const secretKey = await getApiSecret("stripe_secret_key");
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(init.body instanceof URLSearchParams
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body?.error?.message || "Stripe request failed");
  return body as T;
}

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
) {
  return validStripeSignature(
    rawBody,
    signatureHeader,
    await getApiSecret("stripe_webhook_secret"),
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function eventMetadata(object: StripeRecord): Record<string, string> {
  return (
    object.metadata ||
    object.parent?.subscription_details?.metadata ||
    object.subscription_details?.metadata ||
    {}
  );
}

function subscriptionReference(object: StripeRecord) {
  return (
    stringValue(object.subscription) ||
    stringValue(object.parent?.subscription_details?.subscription)
  );
}

export async function processStripeEvent(event: StripeRecord) {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("payment_events")
    .select("processed")
    .eq("event_fingerprint", event.id)
    .maybeSingle();
  if (existing?.processed) return;
  if (!existing) {
    const { error } = await supabase.from("payment_events").insert({
      provider: "stripe",
      event_type: event.type,
      provider_reference: event.data?.object?.id || null,
      event_fingerprint: event.id,
      payload: event,
      processed: false,
    });
    if (error && error.code !== "23505") throw error;
  }

  try {
    const object = event.data?.object || {};
    if (
      event.type === "checkout.session.completed" &&
      object.payment_status === "paid"
    ) {
      if (eventMetadata(object).payment_type === "ebook")
        await recordConfirmedEbookPurchase(object);
      else await recordConfirmedDonation(object, event.created);
    }
    if (
      (event.type === "invoice.paid" ||
        event.type === "invoice.payment_succeeded") &&
      object.billing_reason !== "subscription_create"
    ) {
      await recordConfirmedDonation(object, event.created);
    }
    if (event.type === "charge.refunded") {
      const charge = await stripeRequest<StripeRecord>(`/charges/${object.id}`);
      const { data: donation, error: readError } = await supabase
        .from("donations")
        .select("id,amount_minor,currency,status,refunded_amount")
        .eq("provider_transaction_id", charge.payment_intent)
        .maybeSingle();
      if (readError) throw readError;
      if (donation) {
        if (
          charge.amount !== donation.amount_minor ||
          String(charge.currency).toUpperCase() !== donation.currency
        )
          throw new Error("Refund payment mismatch");
        const { error: refundError } = await supabase
          .from("donations")
          .update({
            status: charge.refunded ? "refunded" : donation.status,
            refunded_amount: Math.max(
              donation.refunded_amount,
              charge.amount_refunded,
            ),
            refunded_at: new Date(event.created * 1000).toISOString(),
          })
          .eq("id", donation.id);
        if (refundError) throw refundError;
      }
    }
    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      const subscription = await stripeRequest<StripeRecord>(
        `/subscriptions/${object.id}`,
      );
      const { error } = await supabase
        .from("donation_subscriptions")
        .update({
          status:
            subscription.status === "canceled"
              ? "cancelled"
              : subscription.status,
          cancelled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          next_payment_at: subscription.items?.data?.[0]?.current_period_end
            ? new Date(
                subscription.items.data[0].current_period_end * 1000,
              ).toISOString()
            : null,
        })
        .eq("stripe_subscription_id", object.id);
      if (error) throw error;
    }
    await supabase
      .from("payment_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("event_fingerprint", event.id);
  } catch (error) {
    await supabase
      .from("payment_events")
      .update({
        processing_error:
          error instanceof Error
            ? error.message
            : "Unknown Stripe processing error",
      })
      .eq("event_fingerprint", event.id);
    throw error;
  }
}

async function recordConfirmedEbookPurchase(object: StripeRecord) {
  const supabase = createServiceClient();
  const metadata = eventMetadata(object);
  const purchaseId = metadata.purchase_id;
  const ebookId = metadata.ebook_id;
  if (!purchaseId || !ebookId)
    throw new Error("Stripe ebook metadata is incomplete");

  const { data: purchase, error: purchaseError } = await supabase
    .from("ebook_purchases")
    .select(
      "id,status,amount_minor,currency,buyer_email,buyer_name,fulfillment_type,ebooks(title,file_path)",
    )
    .eq("id", purchaseId)
    .eq("ebook_id", ebookId)
    .eq("provider_reference", object.id)
    .maybeSingle();
  if (purchaseError) throw purchaseError;
  if (!purchase) throw new Error("The initialized ebook order was not found");

  const amountMinor = Number(object.amount_total ?? 0);
  const currency = String(object.currency || "").toUpperCase();
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
    throw new Error("Stripe confirmed an invalid ebook amount");

  const rawToken =
    purchase.fulfillment_type === "digital"
      ? randomBytes(32).toString("base64url")
      : "";
  const tokenHash = rawToken
    ? createHash("sha256").update(rawToken).digest("hex")
    : "";
  const expiresAt = rawToken
    ? new Date(Date.now() + 30 * 86400000).toISOString()
    : null;
  const shippingAddress =
    object.collected_information?.shipping_details ||
    object.shipping_details ||
    object.customer_details?.address ||
    null;
  const paymentIntentId = stringValue(object.payment_intent) || "";

  const { error } = await supabase.rpc("confirm_ebook_purchase", {
    p_provider_reference: object.id,
    p_payment_intent_id: paymentIntentId || null,
    p_amount_minor: amountMinor,
    p_currency: currency,
    p_shipping_address: shippingAddress,
    p_download_token_hash: tokenHash || null,
    p_download_expires_at: expiresAt,
  });
  if (error) throw error;

  if (rawToken && purchase.status !== "successful") {
    await sendEbookDeliveryEmail({
      email: purchase.buyer_email,
      name: purchase.buyer_name,
      title:
        (purchase.ebooks as unknown as { title?: string } | null)?.title ||
        "Your ebook",
      token: rawToken,
    });
  }
}

async function sendEbookDeliveryEmail(input: {
  email: string;
  name: string;
  title: string;
  token: string;
}) {
  try {
    const apiKey = await getApiSecret("resend_api_key");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const settings = await createServiceClient()
      .from("site_settings")
      .select("contact_email,site_name")
      .maybeSingle();
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || settings.data?.contact_email;
    if (!fromEmail) return;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${settings.data?.site_name || "Glorious Gospel of Christ"} <${fromEmail}>`,
        to: [input.email],
        subject: `Your ebook: ${input.title}`,
        html: `<p>Hello ${escapeHtml(input.name)},</p><p>Thank you for your purchase of <strong>${escapeHtml(input.title)}</strong>.</p><p><a href="${siteUrl}/api/ebooks/download?token=${encodeURIComponent(input.token)}">Download your ebook</a></p><p>This private link expires in 30 days. You can contact us if you need help.</p>`,
      }),
    });
    if (!response.ok)
      console.error("Ebook delivery email failed", await response.text());
  } catch (error) {
    // Payment fulfillment must not fail if email is not configured. The success page also provides access.
    console.error(
      "Ebook delivery email is unavailable",
      error instanceof Error ? error.message : error,
    );
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character,
  );
}

async function recordConfirmedDonation(
  object: StripeRecord,
  eventCreated?: number,
) {
  const supabase = createServiceClient();
  const metadata = eventMetadata(object);
  const frequency = ["weekly", "monthly", "yearly"].includes(metadata.frequency)
    ? metadata.frequency
    : "one_time";
  const campaignId = metadata.campaign_id || null;
  const stripeSubscriptionId = subscriptionReference(object);
  const customerId = stringValue(object.customer);
  const donorEmail =
    metadata.donor_email ||
    object.customer_details?.email ||
    object.customer_email ||
    "donor@unknown.invalid";
  const donorName =
    metadata.donor_name || object.customer_details?.name || "Anonymous donor";
  const donorPhone =
    metadata.donor_phone || object.customer_details?.phone || null;
  const amountMinor = Number(object.amount_total ?? object.amount_paid ?? 0);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
    throw new Error("Stripe confirmed an invalid donation amount");
  let subscriptionId: string | null = null;

  if (stripeSubscriptionId) {
    const { data: existing } = await supabase
      .from("donation_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();
    if (existing?.id) {
      subscriptionId = existing.id;
      await supabase
        .from("donation_subscriptions")
        .update({
          status: "active",
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      subscriptionId = crypto.randomUUID();
      const { error } = await supabase.from("donation_subscriptions").insert({
        id: subscriptionId,
        campaign_id: campaignId,
        donor_name: donorName,
        donor_email: donorEmail,
        donor_phone: donorPhone,
        amount_minor: amountMinor,
        currency: String(object.currency || "").toUpperCase(),
        frequency,
        status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: stripeSubscriptionId,
      });
      if (error) throw error;
    }
  }

  const providerReference = object.id;
  const paymentIntent =
    stringValue(object.payment_intent) ||
    stringValue(object.payment_intent?.id) ||
    stringValue(object.payment?.payment_intent);
  const { error } = await supabase.from("donations").upsert(
    {
      campaign_id: campaignId,
      subscription_id: subscriptionId,
      donor_name: donorName,
      donor_email: donorEmail,
      donor_phone: donorPhone,
      amount_minor: amountMinor,
      currency: String(object.currency || "").toUpperCase(),
      frequency,
      payment_method: "stripe_checkout",
      status: "successful",
      provider: "stripe",
      provider_reference: providerReference,
      provider_transaction_id: paymentIntent,
      is_anonymous: metadata.is_anonymous === "true",
      message: metadata.message || null,
      paid_at: new Date(
        (eventCreated || Math.floor(Date.now() / 1000)) * 1000,
      ).toISOString(),
    },
    { onConflict: "provider_reference", ignoreDuplicates: true },
  );
  if (error) throw error;
}
