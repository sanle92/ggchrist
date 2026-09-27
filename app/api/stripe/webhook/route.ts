import { processGivingEvent } from "@/lib/giving/webhook";
import { processStripeEvent, verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    if (
      !(await verifyStripeSignature(
        rawBody,
        request.headers.get("stripe-signature"),
      ))
    )
      return new Response("Invalid Stripe signature", { status: 400 });
    const event = JSON.parse(rawBody);
    if (!(await processGivingEvent(event))) await processStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
