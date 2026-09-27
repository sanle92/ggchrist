import { NextResponse } from "next/server";
import { givingSchema, amountMinor, contribution } from "@/lib/giving/shared";
import { accessToken, hash, rateLimit, sameOrigin } from "@/lib/giving/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripeRequest } from "@/lib/stripe";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      return NextResponse.json(
        { error: "Please refresh the giving page." },
        { status: 403 },
      );
    if (Number(request.headers.get("content-length") || 0) > 16000)
      return new Response("Request too large", { status: 413 });
    const raw = await request.text();
    if (raw.length > 16000)
      return new Response("Request too large", { status: 413 });
    const parsed = givingSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Please check your gift and contact details." },
        { status: 400 },
      );
    const v = parsed.data;
    let amount: number;
    try {
      amount = amountMinor(v.amount, v.currency);
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 400 },
      );
    }
    const fee = v.coverFees ? contribution(amount, v.currency) : 0;
    const db = createServiceClient();
    await rateLimit("intent:global", 300);
    await rateLimit(`intent:${v.donorEmail}`);
    const { data: settings, error: settingsError } = await db
      .from("site_settings")
      .select("donations_enabled")
      .maybeSingle();
    if (settingsError || !settings || !settings.donations_enabled)
      return NextResponse.json(
        { error: "Online giving is temporarily unavailable." },
        { status: 503 },
      );
    const { data: purpose } = await db
      .from("donation_purposes")
      .select("name")
      .eq("name", v.purpose)
      .eq("active", true)
      .maybeSingle();
    if (!purpose)
      return NextResponse.json(
        { error: "Please choose an available giving purpose." },
        { status: 400 },
      );
    if (v.campaignId) {
      const { data: c } = await db
        .from("campaigns")
        .select("status,currency,starts_at,ends_at")
        .eq("id", v.campaignId)
        .maybeSingle();
      if (
        !c ||
        c.status !== "active" ||
        c.currency !== v.currency ||
        (c.starts_at && Date.parse(c.starts_at) > Date.now()) ||
        (c.ends_at && Date.parse(c.ends_at) < Date.now())
      )
        return NextResponse.json(
          {
            error:
              "This campaign is no longer available in the selected currency.",
          },
          { status: 400 },
        );
    }
    const token = await accessToken(v.attemptId);
    const fingerprint = hash(JSON.stringify(v));
    const { error: insertError } = await db
      .from("donations")
      .insert({
        id: v.attemptId,
        provider_reference: `giving_${v.attemptId}`,
        provider: "stripe",
        payment_method: "stripe_payment_element",
        amount_minor: amount + fee,
        currency: v.currency,
        frequency: v.frequency,
        donor_name: v.donorName,
        donor_email: v.donorEmail,
        donor_phone: v.donorPhone || null,
        country: v.country || null,
        campaign_id: v.campaignId,
        purpose: v.purpose,
        processing_contribution: fee,
        is_anonymous: v.anonymous,
        dedication_type: v.dedicationType || null,
        dedication_name: v.dedicationName || null,
        dedication_message: v.dedicationMessage || null,
        prayer_request: v.prayerRequest || null,
        prayer_team_requested: v.prayerTeamRequested,
        access_token_hash: hash(token),
        request_hash: fingerprint,
      });
    if (insertError && insertError.code !== "23505") throw insertError;
    const { data: record, error: recordError } = await db
      .from("donations")
      .select("*")
      .eq("id", v.attemptId)
      .single();
    if (recordError || record.request_hash !== fingerprint)
      return NextResponse.json(
        {
          error:
            "Your gift details changed. Refresh the page before making a new gift.",
        },
        { status: 409 },
      );
    if (record.status === "successful" || record.status === "refunded")
      return NextResponse.json({ token, complete: true });
    // Never recreate an expired idempotency key's payment after an uncertain response.
    if (Date.now() - Date.parse(record.created_at) > 23 * 3600000)
      return NextResponse.json(
        {
          error:
            "This giving session has expired. Contact the ministry if a payment is pending.",
        },
        { status: 409 },
      );
    const metadata = {
      "metadata[giving_version]": "2",
      "metadata[donation_id]": v.attemptId,
    };
    let clientSecret: string;
    if (v.frequency === "one_time") {
      const intent = await stripeRequest<any>("/payment_intents", {
        method: "POST",
        headers: { "Idempotency-Key": `giving:${v.attemptId}` },
        body: new URLSearchParams({
          amount: String(amount + fee),
          currency: v.currency.toLowerCase(),
          "payment_method_types[0]": "card",
          receipt_email: v.donorEmail,
          ...metadata,
        }),
      });
      clientSecret = intent.client_secret;
      const { error } = await db
        .from("donations")
        .update({ provider_transaction_id: intent.id })
        .eq("id", v.attemptId);
      if (error) throw error;
    } else {
      // A customer per initialized gift avoids linking a guest to another donor by unverified email.
      const customer = await stripeRequest<any>("/customers", {
        method: "POST",
        headers: { "Idempotency-Key": `giving-customer:${v.attemptId}` },
        body: new URLSearchParams({
          name: v.donorName,
          email: v.donorEmail,
          ...metadata,
        }),
      });
      const product = await stripeRequest<any>("/products", {
        method: "POST",
        headers: { "Idempotency-Key": `giving-product:${v.attemptId}` },
        body: new URLSearchParams({
          name: `GGChrist monthly partner — ${v.purpose}`,
        }),
      });
      const sub = await stripeRequest<any>("/subscriptions", {
        method: "POST",
        headers: {
          "Idempotency-Key": `giving-subscription:${v.attemptId}`,
          "Stripe-Version": "2025-06-30.basil",
        },
        body: new URLSearchParams({
          customer: customer.id,
          payment_behavior: "default_incomplete",
          "payment_settings[save_default_payment_method]": "on_subscription",
          "payment_settings[payment_method_types][0]": "card",
          "items[0][price_data][currency]": v.currency.toLowerCase(),
          "items[0][price_data][unit_amount]": String(amount + fee),
          "items[0][price_data][product]": product.id,
          "items[0][price_data][recurring][interval]": "month",
          "expand[0]": "latest_invoice.confirmation_secret",
          ...metadata,
        }),
      });
      clientSecret = sub.latest_invoice?.confirmation_secret?.client_secret;
      const { error } = await db
        .from("donations")
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: sub.id,
          stripe_invoice_id: sub.latest_invoice.id,
        })
        .eq("id", v.attemptId);
      if (error) throw error;
    }
    if (!clientSecret) throw new Error("Missing payment confirmation secret");
    return NextResponse.json(
      { clientSecret, token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not prepare your gift. Please try again shortly; keep this page open if you already started payment.",
      },
      { status: 503 },
    );
  }
}
