import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { money } from "@/lib/giving/shared";
export const metadata = {
  title: "Manage monthly giving | GGChrist",
  robots: { index: false, follow: false },
};
export default async function Manage() {
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  const { data: rows } =
    user?.email && user.email_confirmed_at
      ? await createServiceClient()
          .from("donation_subscriptions")
          .select("id,amount_minor,currency,purpose,status")
          .ilike("donor_email", user.email.replace(/[\\%_]/g, "\\$&"))
      : { data: [] };
  return (
    <section className="ggc-shell py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl">Your monthly partnership</h1>
        <p className="mt-4 leading-7 text-ink3">
          Thank you for faithfully supporting the ministry. Manage your payment
          method or cancel your monthly gift securely with Stripe.
        </p>
        {!user ? (
          <p className="mt-6">
            <a href="/community" className="underline">
              Sign in with your donation email
            </a>
            , then return to this page.
          </p>
        ) : rows?.length ? (
          rows.map((s) => (
            <form
              key={s.id}
              action="/api/giving/portal"
              method="post"
              className="mt-5 rounded-2xl border border-border p-5"
            >
              <input type="hidden" name="subscription" value={s.id} />
              <p className="font-semibold">
                {money(s.amount_minor, s.currency)} monthly
              </p>
              <p className="my-3">
                {s.purpose} · {s.status}
              </p>
              <button className="btn-nav btn-amber">Manage with Stripe</button>
            </form>
          ))
        ) : (
          <p className="mt-6">
            No monthly gifts are linked to this email.{" "}
            <a href="/contact" className="underline">
              Contact the ministry
            </a>{" "}
            if you need help.
          </p>
        )}
      </div>
    </section>
  );
}
