// Existing Stripe-hosted sessions continue to settle through the existing webhook.
// New gifts must use the validated one-page flow. Ebook checkout is unaffected.
export async function POST() {
  return Response.json(
    { error: "Please refresh /donate to use the updated secure giving form." },
    { status: 410 },
  );
}
