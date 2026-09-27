import { getSiteSettings } from "@/lib/site-settings";
import { currencies, type Currency } from "@/lib/giving/shared";
import type { Metadata } from "next";
import { Heart, BookOpen, Globe, ArrowRight, LockKeyhole } from "lucide-react";
import { DonationForm, type GivingCampaign } from "@/components/donation-form";
import { createClient } from "@/lib/supabase/server";
import { getApiSecret } from "@/lib/server-secrets";
import { purposes as defaults } from "@/lib/giving/shared";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}): Promise<Metadata> {
  const { campaign } = await searchParams;
  let title = "Donate | Support Glorious Gospel of Christ";
  if (campaign && /^[a-zA-Z0-9-]{1,150}$/.test(campaign)) {
    const db = await createClient();
    const { data } = await db
      .from("campaigns")
      .select("title")
      .eq("slug", campaign)
      .eq("status", "active")
      .maybeSingle();
    if (data) title = `Support ${data.title} | GGChrist`;
  }
  const description =
    "Support Glorious Gospel of Christ and help share biblical teaching, Gospel outreach, missions, and ministry resources around the world.";
  return {
    title,
    description,
    alternates: { canonical: "/donate" },
    openGraph: {
      title,
      description,
      images: ["/images/premium-bible-hero.webp"],
    },
  };
}
export default async function DonatePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const params = await searchParams,
    db = await createClient(),
    now = new Date().toISOString();
  const [{ data: rows }, { data: purposeRows }, key] = await Promise.all([
    db
      .from("campaigns")
      .select(
        "id,slug,title,description,currency,target_amount_minor,raised_amount_minor,donor_count,cover_image_url",
      )
      .eq("status", "active")
      .in("currency", ["USD", "UGX", "EUR", "GBP"])
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("featured", { ascending: false })
      .order("created_at"),
    db
      .from("donation_purposes")
      .select("name")
      .eq("active", true)
      .order("sort_order"),
    getApiSecret("stripe_publishable_key").catch(() => null),
  ]);
  const settings = await getSiteSettings();
  const defaultCurrency = currencies.includes(settings?.default_currency) ? settings.default_currency as Currency : "USD";
  const campaigns = (rows || []) as GivingCampaign[],
    selected = campaigns.find(
      (c) => c.slug === params.campaign || c.id === params.campaign,
    );
  const faqs = [
    [
      "Is my donation secure?",
      "Your payment details are handled securely by Stripe. GGChrist does not collect or store your card number or security code.",
    ],
    [
      "Can I give monthly?",
      "Yes. Choose Monthly to become a ministry partner. Your selected amount, including any optional processing contribution, renews every month until cancelled.",
    ],
    [
      "Can I cancel monthly giving?",
      "Yes. Use Manage monthly giving below and sign in with your donation email to open your secure billing portal.",
    ],
    [
      "Will I receive a receipt?",
      "After your payment is confirmed, you can download a receipt and receive a confirmation at the email address you provided.",
    ],
    [
      "Can I give anonymously?",
      "Yes. Select Give anonymously. Your contact information stays private, and your name is hidden from public recognition.",
    ],
    [
      "Can I choose where my donation goes?",
      "Yes. Choose a giving purpose or support an active campaign in the donation form.",
    ],
  ];
  return (
    <div className="giving-page">
      <section className="bg-cream py-10 md:py-16">
        <div className="ggc-shell grid items-start gap-9 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <p className="section-kicker">Give with a cheerful heart</p>
            <h1 className="mt-5 max-w-xl font-serif text-[clamp(2.6rem,4.6vw,4.8rem)] leading-[1.06] tracking-[-.035em]">
              Give.
              <br />
              Support the Gospel.
              <br />
              <span className="text-amber">Impact Lives.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-ink3">
              Your generosity helps Glorious Gospel of Christ share the Word of
              God, publish biblical teachings and devotions, support ministry
              activities, and reach people around the world with the Gospel of
              Jesus Christ.
            </p>
            <blockquote className="mt-7 border-l-2 border-amber pl-5">
              <p className="font-serif text-2xl leading-8">
                “God loveth a cheerful giver.”
              </p>
              <cite className="mt-2 block text-sm not-italic text-ink3">
                2 Corinthians 9:7
              </cite>
            </blockquote>
            <a href="#give" className="btn-nav btn-amber mt-7 min-h-12 px-6">
              Give Now <ArrowRight size={16} />
            </a>
            <div className="mt-9 hidden overflow-hidden rounded-2xl lg:block">
              <img
                src="/images/premium-bible-hero.webp"
                alt="An open Bible"
                className="aspect-[16/8] w-full object-cover"
              />
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-ink3">
              <LockKeyhole size={15} />
              Your generosity matters. Your privacy matters too.
            </p>
          </div>
          <div id="give" className="min-w-0 scroll-mt-28">
            {params.campaign && !selected ? (
              <p
                role="status"
                className="mb-4 rounded-xl border border-border bg-surface p-4 text-sm"
              >
                This campaign is not currently available. You can still support
                the ministry or choose an active campaign below.
              </p>
            ) : null}
            <DonationForm defaultCurrency={defaultCurrency}
              key={selected?.id || "general"}
              campaigns={campaigns}
              purposes={purposeRows?.map((p) => p.name) || defaults}
              publishableKey={key?.startsWith("pk_") ? key : null}
              initialCampaignId={selected?.id}
            />
          </div>
        </div>
      </section>
      <section className="ggc-shell py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-kicker">Together in His service</p>
          <h2 className="mt-4 font-serif text-4xl">
            Small acts of generosity.
            <br />A lasting ministry of hope.
          </h2>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {[
            [
              BookOpen,
              "Share the Word",
              "Help make biblical teaching and daily devotions available to people seeking truth.",
            ],
            [
              Globe,
              "Reach more lives",
              "Support Gospel outreach, missions, and ministry resources around the world.",
            ],
            [
              Heart,
              "Care for our communities",
              "Help the ministry respond with compassion wherever support is needed.",
            ],
          ].map(([Icon, title, description]) => {
            const I = Icon as typeof Heart;
            return (
              <article
                key={String(title)}
                className="rounded-2xl border border-border p-6"
              >
                <I className="text-amber" size={23} />
                <h3 className="mt-4 font-serif text-2xl">{String(title)}</h3>
                <p className="mt-3 text-sm leading-7 text-ink3">
                  {String(description)}
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="border-t border-border bg-surface py-14">
        <div className="ggc-shell grid gap-8 md:grid-cols-[.7fr_1fr]">
          <div>
            <p className="section-kicker">Giving, made simple</p>
            <h2 className="mt-4 font-serif text-4xl">
              Questions about giving?
            </h2>
            <p className="mt-4 leading-7 text-ink3">
              We’re here to help you give with confidence.
            </p>
            <a className="mt-5 inline-block underline" href="/contact">
              Contact the ministry
            </a>
          </div>
          <div className="divide-y divide-border">
            {faqs.map(([q, a]) => (
              <details key={q} className="py-4">
                <summary className="cursor-pointer py-2 font-semibold">
                  {q}
                </summary>
                <p className="mt-2 text-sm leading-7 text-ink3">{a}</p>
              </details>
            ))}
            <a
              href="/giving/manage"
              className="inline-block py-5 font-semibold underline"
            >
              Manage monthly giving →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
