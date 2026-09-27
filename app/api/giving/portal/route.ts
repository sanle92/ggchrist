import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripeRequest } from "@/lib/stripe";
import { sameOrigin, siteUrl, rateLimit } from "@/lib/giving/server";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      return new Response("Please refresh the page.", { status: 403 });
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user?.email || !user.email_confirmed_at)
      return new Response("Sign in with your verified donation email.", {
        status: 401,
      });
    await rateLimit(`portal:${user.id}`, 10);
    const form = await request.formData(),
      id = String(form.get("subscription") || "");
    const { data: s } = await createServiceClient()
      .from("donation_subscriptions")
      .select("stripe_customer_id")
      .eq("id", id)
      .ilike("donor_email", user.email.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    if (!s?.stripe_customer_id)
      return new Response("Monthly gift not found.", { status: 404 });
    const portal = await stripeRequest<any>("/billing_portal/sessions", {
      method: "POST",
      body: new URLSearchParams({
        customer: s.stripe_customer_id,
        return_url: `${siteUrl()}/giving/manage`,
      }),
    });
    return Response.redirect(portal.url, 303);
  } catch {
    return new Response(
      "Billing management is temporarily unavailable. Please contact the ministry.",
      { status: 503 },
    );
  }
}
