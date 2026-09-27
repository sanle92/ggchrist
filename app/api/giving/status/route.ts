import { privateDonation } from "@/lib/giving/server";
export async function GET(request: Request) {
  try {
    const d = await privateDonation(
      new URL(request.url).searchParams.get("token"),
    );
    if (!d) return Response.json({ error: "Gift not found." }, { status: 404 });
    return Response.json(
      {
        status: d.status,
        reference: d.reference,
        amount: d.amount_minor,
        currency: d.currency,
        frequency: d.frequency,
        purpose: d.purpose,
        campaign: d.campaigns?.title,
        date: d.paid_at,
        emailSent: !!d.email_sent_at,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "We are still confirming your gift." },
      { status: 503 },
    );
  }
}
