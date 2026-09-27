import type { Metadata } from "next";
import { GivingStatus } from "@/components/giving-status";
import { PaymentStatus } from "@/components/payment-status";
export const metadata: Metadata = {
  title: "Your gift | GGChrist",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const p = await searchParams;
  return (
    <section className="ggc-shell py-14">
      <div className="mx-auto max-w-2xl">
        {p.session_id ? (
          <PaymentStatus reference={p.session_id} />
        ) : (
          <GivingStatus />
        )}
      </div>
    </section>
  );
}
