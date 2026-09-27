import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Heart,
  Quote,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, contentMetadata, jsonLd } from "@/lib/seo";
import { AudioPlayer } from "@/components/audio-player";

type Props = { params: Promise<{ slug: string }> };
async function getDevotion(slug: string) {
  const supabase = await createClient();
  return (
    await supabase
      .from("devotions")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle()
  ).data;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getDevotion(slug);
  return item
    ? contentMetadata({ title: item.seo_title || item.title, description: item.seo_description || item.reflection, path: `/devotions/${slug}`, canonicalUrl: item.canonical_url, imageUrl: item.cover_image_url, publishedAt: item.published_at || item.devotion_date, modifiedAt: item.updated_at, keywords: [item.focus_keyword, item.reference].filter(Boolean), noIndex: item.no_index })
    : { title: "Devotion not found" };
}

export default async function DevotionPage({ params }: Props) {
  const { slug } = await params;
  const item = await getDevotion(slug);
  if (!item) notFound();
  const supabase = await createClient();
  const [{ data: related }, { data: daily }] = await Promise.all([
    supabase
      .from("devotions")
      .select("slug,title,reference,devotion_date")
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("id", item.id)
      .order("devotion_date", { ascending: false })
      .limit(4),
    supabase
      .from("daily_features")
      .select("featured_verse,verse_book,verse_chapter")
      .eq("status", "published")
      .order("feature_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const date = new Date(`${item.devotion_date}T12:00:00`).toLocaleDateString(
    "en",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.reflection?.slice(0, 200),
    image: item.cover_image_url ? [item.cover_image_url] : undefined,
    datePublished: item.published_at || item.devotion_date,
    mainEntityOfPage: absoluteUrl(`/devotions/${item.slug}`),
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
  };

  return (
    <div className="ggc-shell py-10 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Devotions', path: '/devotions' }, { name: item.title, path: `/devotions/${item.slug}` }])) }} />
      <Link
        href="/devotions"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-forest"
      >
        <ArrowLeft size={15} /> Devotion archive
      </Link>
      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <article className="overflow-hidden border border-border bg-surface shadow-shadow">
          <header className="relative min-h-[430px] overflow-hidden bg-[#081827] p-7 text-white md:p-12">
            <img
              src={item.cover_image_url || "/images/premium-bible-hero.webp"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071522] via-[#071522]/50 to-transparent" />
            <div className="relative flex min-h-[350px] flex-col justify-end">
              <div className="flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.17em] text-white/65">
                <CalendarDays size={14} /> {date}
              </div>
              <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3.2rem,7vw,6.8rem)] leading-[.87] tracking-[-.045em]">
                {item.title}
              </h1>
              <p className="mt-6 text-[.65rem] font-bold uppercase tracking-[.2em] text-amber3">
                {item.reference}
              </p>
              {item.audio_url ? (
                <div className="mt-6 flex justify-center max-w-xl">
                  <AudioPlayer
                    src={item.audio_url}
                    label={item.audio_title || item.title}
                  />
                </div>
              ) : null}
            </div>
          </header>
          {item.scripture ? (
            <section className="border-b border-border px-7 py-10 text-center md:px-12 md:py-14">
              <p className="section-kicker">Scripture</p>
              <Quote size={25} className="mt-7 text-amber/35" />
              <blockquote className="mx-auto mt-4 max-w-3xl font-serif text-2xl italic leading-[1.45] text-ink md:text-3xl">
                {item.scripture}
              </blockquote>
              {item.reference ? (
                <p className="mt-6 text-[.65rem] font-bold uppercase tracking-[.2em] text-amber">
                  {item.reference}
                </p>
              ) : null}
            </section>
          ) : null}
          <section className="px-7 py-10 md:px-12 md:py-14">
            <p className="section-kicker">Reflection</p>
            <div className="prose mt-7 max-w-none">
              <ReactMarkdown>{item.reflection}</ReactMarkdown>
            </div>
          </section>
          {item.prayer ? (
            <section className="border-t border-border bg-amber/5 px-7 py-10 md:px-12">
              <p className="section-kicker">Prayer</p>
              <p className="mt-6 font-serif text-2xl leading-[1.45] text-ink2">
                {item.prayer}
              </p>
            </section>
          ) : null}
          <footer className="flex flex-wrap gap-3 border-t border-border p-6 md:px-12">
            <button className="btn-nav btn-outline">
              <Share2 size={14} /> Share
            </button>
            <Link href="/devotions" className="btn-nav btn-amber">
              More devotions <ArrowRight size={14} />
            </Link>
          </footer>
        </article>

        <aside className="grid gap-5 lg:sticky lg:top-28">
          <section className="bg-[#142b3f] p-6 text-white">
            <BookOpen size={23} className="text-amber3" />
            <h2 className="mt-5 font-serif text-3xl">Daily devotion</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Return each day for Scripture, reflection, audio and prayer.
            </p>
            <Link
              href="/devotions"
              className="btn-nav mt-6 w-full bg-white text-[#142b3f]"
            >
              Browse archive
            </Link>
          </section>
          {daily ? (
            <blockquote className="border border-border bg-surface p-6">
              <Quote size={21} className="text-amber/35" />
              <p className="mt-4 font-serif text-xl italic leading-8 text-ink">
                "{daily.featured_verse}"
              </p>
              <footer className="mt-5 text-[.6rem] font-bold uppercase tracking-[.18em] text-amber">
                {daily.verse_book} {daily.verse_chapter}
              </footer>
            </blockquote>
          ) : null}
          {related?.length ? (
            <section className="border border-border bg-surface p-6">
              <h2 className="text-xs font-bold uppercase tracking-[.16em] text-forest">
                Continue reflecting
              </h2>
              <div className="mt-4 divide-y divide-border">
                {related.map((devotion) => (
                  <Link
                    key={devotion.slug}
                    href={`/devotions/${devotion.slug}`}
                    className="group block py-4 first:pt-0 last:pb-0"
                  >
                    <p className="text-[.58rem] font-bold uppercase tracking-[.14em] text-amber">
                      {devotion.reference}
                    </p>
                    <p className="mt-1 font-serif text-xl leading-tight group-hover:text-amber">
                      {devotion.title}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <Link
            href="/community?tab=prayers"
            className="flex items-center gap-3 border border-border bg-cream2 p-5 text-sm font-semibold text-forest"
          >
            <Heart size={18} className="text-amber" /> Share a prayer request
          </Link>
        </aside>
      </div>
    </div>
  );
}
