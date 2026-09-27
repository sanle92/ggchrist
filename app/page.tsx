import Link from "next/link";
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  BookOpenText,
  HeartHandshake,
  Headphones,
  Play,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VerseOfDay } from "@/components/verse-of-day";
import { AudioPlayer } from "@/components/audio-player";
import { EbookCard } from "@/components/ebook-card";
import { EngagementBar } from "@/components/engagement-bar";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const [
    featureResult,
    articleResult,
    devotionResult,
    ebooksResult,
    teachingsResult,
  ] = await Promise.all([
    supabase
      .from("daily_features")
      .select(
        "id,verse_book,verse_chapter,featured_verse,background_image_url,like_count,comment_count,share_count",
      )
      .eq("status", "published")
      .order("feature_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("articles")
      .select(
        "id,slug,title,excerpt,category,cover_image_url,published_at,is_featured,view_count,like_count,comment_count,share_count",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("devotions")
      .select(
        "id,slug,title,scripture,reflection,reference,cover_image_url,devotion_date,audio_url,audio_title,like_count,comment_count,share_count",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("devotion_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ebooks")
      .select(
        "slug,title,subtitle,author,cover_image_url,price_minor,currency,format,rating",
      )
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("bible_teachings")
      .select(
        "id,slug,title,subtitle,cover_image_url,view_count,like_count,comment_count,share_count",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(2),
  ]);
  const feature = featureResult.data;
  const article = articleResult.data;
  const devotion = devotionResult.data;
  const ebooks = ebooksResult.data || [];
  const teachings = teachingsResult.data || [];
  const verse =
    feature?.featured_verse ||
    "For I am not ashamed of the Gospel, for it is the power of God for salvation to everyone who believes.";
  const reference = feature
    ? `${feature.verse_book} ${feature.verse_chapter}`
    : "Romans 1:16";

  return (
    <>
      <section className="border-b border-border bg-cream py-7 md:py-2">
        <div className="ggc-shell grid gap-2 lg:grid-cols-[.78fr_1.58fr_.9fr]">
          <VerseOfDay verse={verse} reference={reference}>
            {feature ? (
              <EngagementBar
                className="mt-5"
                contentType="daily_feature"
                contentId={feature.id}
                likes={feature.like_count}
                comments={feature.comment_count}
                shares={feature.share_count}
                title={`Verse of the Day — ${reference}`}
                url="/"
              />
            ) : null}
          </VerseOfDay>
          <Link
            href={devotion ? `/devotions/${devotion.slug}` : "/devotions"}
            className="group relative min-h-[370px] overflow-hidden bg-[#071522] text-white shadow-shadow2 lg:min-h-[410px]"
          >
            <img
              src={
                devotion?.cover_image_url || "/images/premium-bible-hero.webp"
              }
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,34,.12),rgba(7,21,34,.92))]" />
            <div className="relative flex min-h-[370px] flex-col justify-end p-7 md:p-10 lg:min-h-[410px]">
              <p className="text-[.63rem] font-bold uppercase tracking-[.2em] text-amber3">
                {devotion?.reference || reference}
              </p>
              <h1 className="mt-4 max-w-2xl font-serif text-[clamp(1.8rem,3.5vw,3.2rem)] leading-[.88] tracking-[-.04em]">
                {devotion?.title || "Meet God in the quiet."}
              </h1>
              <p className="mt-5 line-clamp-2 max-w-2xl text-sm leading-7 text-white/65">
                {devotion?.scripture || devotion?.reflection || verse}
              </p>
              {devotion?.audio_url ? (
                <div className="mt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-amber">
                    <Headphones size={14} /> Listen to Devotion
                  </span>
                </div>
              ) : null}
              {devotion ? (
                <EngagementBar
                  className="mt-5"
                  tone="dark"
                  contentType="devotion"
                  contentId={devotion.id}
                  likes={devotion.like_count}
                  comments={devotion.comment_count}
                  shares={devotion.share_count}
                  title={devotion.title}
                  url={`/devotions/${devotion.slug}`}
                />
              ) : null}
            </div>
          </Link>
          <article className="flex min-h-[270px] flex-col overflow-hidden border border-border bg-surface shadow-shadow">
            <div className="flex flex-1 flex-col p-7">
              <p className="text-[.6rem] font-bold uppercase tracking-[.18em] text-amber">
                {article?.category || "From the journal"}
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-[1.02]">
                {article?.title || "Fresh Gospel-centered writing is coming."}
              </h2>
              <p className="mt-4 line-clamp-3 text-sm leading-7 text-ink3">
                {article?.excerpt ||
                  "Read thoughtful articles that bring biblical truth into everyday life."}
              </p>
              {article ? (
                <EngagementBar
                  className="mt-5"
                  contentType="article"
                  contentId={article.id}
                  likes={article.like_count}
                  comments={article.comment_count}
                  shares={article.share_count}
                  views={article.view_count}
                  title={article.title}
                  url={`/articles/${article.slug}`}
                />
              ) : null}
              <Link
                href={article ? `/articles/${article.slug}` : "/articles"}
                className="mt-auto pt-7 text-xs font-bold uppercase tracking-[.13em] text-forest"
              >
                Read article <ArrowRight size={14} className="ml-1 inline" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="ggc-shell py-16 md:py-20">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="section-kicker">A whole-life faith</p>
            <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-none md:text-5xl">
              Simple rhythms. Deep roots. A faith lived fully.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-ink3">
            Scripture, formation and community designed to help the Gospel move
            from the page into every part of life.
          </p>
        </div>
        <div className="mt-10 flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0">
          {[
            [
              BookHeart,
              "Daily devotion",
              "Begin with Scripture.",
              "/devotions",
            ],
            [
              BookOpenText,
              "Bible teaching",
              "Study with clarity.",
              "/bible-teachings",
            ],
            [HeartHandshake, "Community", "Grow with others.", "/community"],
          ].map(([Icon, title, text, href]) => {
            const ItemIcon = Icon as typeof BookHeart;
            return (
              <Link
                key={String(href)}
                href={String(href)}
                className="group flex min-h-40 min-w-[260px] flex-col border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-amber md:min-w-0"
              >
                <ItemIcon size={21} className="text-amber" />
                <h3 className="mt-auto font-serif text-2xl">{String(title)}</h3>
                <p className="mt-1 text-xs text-ink3">{String(text)}</p>
                <ArrowRight
                  size={14}
                  className="ml-auto mt-4 text-forest transition group-hover:translate-x-1"
                />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16 md:py-20">
        <div className="ggc-shell">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="section-kicker">The reading room</p>
              <h2 className="mt-5 font-serif text-3xl md:text-5xl">
                Ebooks for a deeper walk.
              </h2>
            </div>
            <Link
              href="/ebooks"
              className="btn-nav btn-outline hidden sm:inline-flex"
            >
              View library <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ebooks.length ? (
              ebooks.map((ebook, index) => (
                <EbookCard key={ebook.slug} ebook={ebook} index={index} />
              ))
            ) : (
              <div className="border border-dashed border-border p-10 text-center text-ink3">
                No ebooks available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="ggc-shell py-16 md:py-20">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[.78fr_1.22fr] lg:gap-5">
          <div className="min-w-[300px] bg-[#142b3f] p-6 text-white md:p-8 lg:min-w-0">
            <p className="section-kicker text-amber3">Study the Word</p>
            <h2 className="mt-4 font-serif text-3xl leading-[.92] md:text-4xl lg:text-5xl">
              Rooted truth for everyday life.
            </h2>
            <p className="mt-4 text-xs leading-6 text-white/55 md:text-sm md:leading-7">
              Professional, thoughtful teaching that opens Scripture clearly and
              leads toward faithful action.
            </p>
            <Link
              href="/bible-teachings"
              className="btn-nav mt-6 bg-white text-[#142b3f] text-sm"
            >
              Explore teachings <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-1 md:overflow-x-visible md:pb-0">
            {teachings.length ? (
              teachings.map((teaching) => (
                <article
                  key={teaching.slug}
                  className="group grid min-w-[280px] gap-4 border border-border bg-surface p-4 sm:grid-cols-[120px_1fr] sm:items-center md:min-w-0"
                >
                  <Link
                    href={`/bible-teachings/${teaching.slug}`}
                    className="aspect-[4/3] overflow-hidden bg-[#142b3f] sm:w-[120px]"
                  >
                    {teaching.cover_image_url ? (
                      <img
                        src={teaching.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : null}
                  </Link>
                  <div>
                    <p className="text-[.58rem] font-bold uppercase tracking-[.18em] text-amber">
                      Bible teaching
                    </p>
                    <Link href={`/bible-teachings/${teaching.slug}`}>
                      <h3 className="mt-2 font-serif text-xl leading-tight transition hover:text-amber sm:text-2xl">
                        {teaching.title}
                      </h3>
                    </Link>
                    <p className="mt-2 line-clamp-2 text-xs text-ink3 sm:text-sm">
                      {teaching.subtitle}
                    </p>
                    <EngagementBar
                      className="mt-3"
                      contentType="teaching"
                      contentId={teaching.id}
                      likes={teaching.like_count}
                      comments={teaching.comment_count}
                      shares={teaching.share_count}
                      views={teaching.view_count}
                      title={teaching.title}
                      url={`/bible-teachings/${teaching.slug}`}
                    />
                  </div>
                </article>
              ))
            ) : (
              <div className="border border-dashed border-border p-10 text-center text-ink3">
                Published teachings will appear here.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
