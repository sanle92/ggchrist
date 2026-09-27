import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Clock3,
  Quote,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, contentMetadata, jsonLd } from "@/lib/seo";
import { ContentTracker } from "@/components/content-tracker";
import { RichContent } from "@/components/rich-content";
import { ContentViewCounter } from "@/components/content-view-counter";

type Props = { params: Promise<{ slug: string }> };
async function getTeaching(slug: string) {
  const supabase = await createClient();
  return (
    await supabase
      .from("bible_teachings")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
  ).data;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getTeaching(slug);
  return item
    ? contentMetadata({ title: item.seo_title || item.title, description: item.seo_description || item.subtitle || item.body, path: `/bible-teachings/${slug}`, canonicalUrl: item.canonical_url, imageUrl: item.cover_image_url, publishedAt: item.published_at, modifiedAt: item.updated_at, keywords: [item.focus_keyword].filter(Boolean), noIndex: item.no_index })
    : { title: "Teaching not found" };
}

export default async function TeachingPage({ params }: Props) {
  const { slug } = await params;
  const item = await getTeaching(slug);
  if (!item) notFound();
  const supabase = await createClient();
  const { data: related } = await supabase
    .from("bible_teachings")
    .select("slug,title,subtitle,cover_image_url,view_count")
    .eq("status", "published")
    .neq("id", item.id)
    .order("published_at", { ascending: false })
    .limit(5);
  const minutes =
    Number(item.read_time_minutes) ||
    Math.max(4, Math.ceil(String(item.body || "").split(/\s+/).length / 210));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.subtitle || item.body?.slice(0, 200),
    image: item.cover_image_url ? [item.cover_image_url] : undefined,
    datePublished: item.published_at,
    dateModified: item.updated_at,
    mainEntityOfPage: absoluteUrl(`/bible-teachings/${item.slug}`),
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
  };
  return (
    <div className="ggc-shell py-10 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Bible Teachings', path: '/bible-teachings' }, { name: item.title, path: `/bible-teachings/${item.slug}` }])) }} />
      <Link
        href="/bible-teachings"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-forest"
      >
        <ArrowLeft size={15} /> Teaching library
      </Link>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <article>
          <header className="border border-border bg-surface p-7 md:p-12">
            <p className="section-kicker">Bible teaching</p>
            <h1 className="mt-6 font-serif text-[clamp(3.4rem,7vw,4.8rem)] leading-[.88] tracking-[-.045em]">
              {item.title}
            </h1>
            {item.subtitle ? (
              <p className="mt-7 max-w-3xl text-lg leading-8 text-ink3">
                {item.subtitle}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-5 border-t border-border pt-6 text-xs font-semibold text-ink3">
              <span className="flex items-center gap-2">
                <Clock3 size={15} className="text-amber" /> {minutes} min read
              </span>
              <ContentViewCounter contentType="teaching" contentId={item.id} initialViews={Number(item.view_count || 0)} noun="reads" />
              <button className="ml-auto flex items-center gap-2 text-forest">
                <Share2 size={15} /> Share
              </button>
            </div>
          </header>
          {item.cover_image_url ? (
            <img
              src={item.cover_image_url}
              alt=""
              className="mt-5 aspect-[16/8] w-full border border-border object-cover"
            />
          ) : null}
          <div className="mt-5 border border-border bg-surface px-7 py-10 md:px-12 md:py-14">
            <div id="teaching-content" className="prose max-w-none">
              <RichContent content={item.body} />
            </div>
          </div>
          <div className="mt-5 bg-[#142b3f] p-8 text-white md:p-10">
            <Quote size={25} className="text-amber3" />
            <p className="mt-5 font-serif text-3xl leading-tight">
              Truth is given not only to inform us, but to transform the way we
              follow Christ.
            </p>
            <Link
              href="/community"
              className="btn-nav mt-7 bg-white text-[#142b3f]"
            >
              Discuss in community <ArrowRight size={14} />
            </Link>
          </div>
        </article>
        <aside className="grid gap-5 lg:sticky lg:top-28">
          <section className="bg-[#142b3f] p-6 text-white">
            <BookOpenText size={24} className="text-amber3" />
            <h2 className="mt-5 font-serif text-3xl">Study with purpose</h2>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Read slowly. Keep your Bible open. Note what God is teaching and
              one faithful step you can take.
            </p>
          </section>
          <ContentTracker rootId="teaching-content" label="In this teaching" />
          <nav
            className="border border-border bg-surface p-6"
            aria-label="Related teachings"
          >
            <h2 className="text-xs font-bold uppercase tracking-[.17em] text-forest">
              More teachings
            </h2>
            <div className="mt-4 divide-y divide-border">
              {related?.length ? (
                related.map((teaching) => (
                  <Link
                    href={`/bible-teachings/${teaching.slug}`}
                    key={teaching.slug}
                    className="group block py-4 first:pt-0 last:pb-0"
                  >
                    <p className="font-serif text-xl leading-tight group-hover:text-amber">
                      {teaching.title}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink3">
                      {teaching.subtitle}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-ink3">
                  More teachings will appear here.
                </p>
              )}
            </div>
            <Link
              href="/bible-teachings"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-forest"
            >
              View all <ArrowRight size={14} />
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}
