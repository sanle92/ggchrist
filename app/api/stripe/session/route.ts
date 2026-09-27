import { NextResponse } from "next/server";
import { stripeRequest } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId))
    return NextResponse.json(
      { error: "Invalid checkout session." },
      { status: 400 },
    );
  try {
    const session = await stripeRequest<{
      payment_status: string;
      status: string;
      metadata?: Record<string, string>;
    }>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const stripeSuccessful =
      session.payment_status === "paid" || session.status === "complete";
    if (session.metadata?.payment_type === "ebook") {
      const { data: purchase } = await createServiceClient()
        .from("ebook_purchases")
        .select("status,fulfillment_type,ebooks(title)")
        .eq("provider_reference", sessionId)
        .maybeSingle();
      const ebook = purchase?.ebooks as unknown as { title?: string } | null;
      const successful = stripeSuccessful && purchase?.status === "successful";
      return NextResponse.json({
        kind: "ebook",
        status: successful ? "successful" : "pending",
        title: ebook?.title || "Your ebook",
        physical: purchase?.fulfillment_type === "physical",
        download_url:
          successful && purchase?.fulfillment_type === "digital"
            ? `/api/ebooks/download?session_id=${encodeURIComponent(sessionId)}`
            : null,
      });
    }
    const { data: donation } = await createServiceClient()
      .from("donations")
      .select("status")
      .eq("provider_reference", sessionId)
      .maybeSingle();
    return NextResponse.json(
      {
        kind: "donation",
        status: donation?.status === "successful" ? "successful" : "pending",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "The payment could not be verified yet." },
      { status: 502 },
    );
  }
}
