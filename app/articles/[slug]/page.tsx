import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, contentMetadata, jsonLd } from "@/lib/seo";
import { ContentTracker } from "@/components/content-tracker";
import { RichContent } from "@/components/rich-content";
import { ContentViewCounter } from "@/components/content-view-counter";

type ArticlePageProps = { params: Promise<{ slug: string }> };

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article not found" };
  return contentMetadata({ title: article.seo_title || article.title, description: article.seo_description || article.excerpt || article.content, path: `/articles/${slug}`, canonicalUrl: article.canonical_url, imageUrl: article.cover_image_url, publishedAt: article.published_at, modifiedAt: article.updated_at, author: article.author_name, keywords: [article.focus_keyword, ...(article.tags || [])], noIndex: article.no_index });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const supabase = await createClient();
  const { data: related } = await supabase
    .from("articles")
    .select("slug,title,subtitle,cover_image_url,read_time_minutes")
    .eq("status", "published")
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(5);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seo_description || article.excerpt,
    image: article.cover_image_url ? [article.cover_image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Person", name: article.author_name },
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    mainEntityOfPage: absoluteUrl(`/articles/${article.slug}`),
  };
  return (
    <div className="ggc-shell py-10 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Articles', path: '/articles' }, { name: article.title, path: `/articles/${article.slug}` }])) }} />
      <Link
        href="/articles"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-forest"
      >
        <ArrowLeft size={15} /> Article library
      </Link>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <article>
          <header className="border border-border bg-surface p-7 md:p-12">
            <p className="section-kicker">{article.category}</p>
            <h1 className="mt-6 font-serif text-[clamp(3.3rem,7vw,6.4rem)] leading-[0.96] tracking-[-0.035em]">
              {article.title}
            </h1>
            {article.subtitle ? (
              <p className="mt-7 max-w-3xl text-lg leading-8 text-ink3">
                {article.subtitle}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-5 border-t border-border pt-6 text-xs font-semibold text-ink3">
              <span className="font-semibold text-forest">
                {article.author_name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={15} className="text-amber" />{" "}
                {article.read_time_minutes} min read
              </span>
              <ContentViewCounter contentType="article" contentId={article.id} initialViews={Number(article.view_count || 0)} />
              {article.published_at ? (
                <time>
                  {new Date(article.published_at).toLocaleDateString("en", {
                    dateStyle: "long",
                  })}
                </time>
              ) : null}
            </div>
          </header>
          {article.cover_image_url ? (
            <img
              src={article.cover_image_url}
              alt=""
              className="mt-5 aspect-[16/8] w-full border border-border object-cover"
            />
          ) : null}
          <div className="mt-5 border border-border bg-surface px-7 py-10 md:px-12 md:py-14">
            <div id="article-content" className="prose max-w-none">
              <RichContent content={article.content} />
            </div>
          </div>
        </article>
        <aside className="grid gap-5 lg:sticky lg:top-28">
          <section className="bg-[#142b3f] p-6 text-white">
            <BookOpenText size={24} className="text-amber3" />
            <h2 className="mt-5 font-serif text-3xl">Read with purpose</h2>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Reflect on what you read. Let Scripture shape your thinking.
              Consider one way to apply what you learn today.
            </p>
          </section>
          <ContentTracker rootId="article-content" label="In this article" />
          <section className="border border-border bg-surface p-6">
            <h2 className="text-xs font-bold uppercase tracking-[.17em] text-forest">
              Featured topics
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/articles?category=discipleship"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-forest hover:border-amber hover:text-amber"
              >
                Discipleship
              </Link>
              <Link
                href="/articles?category=prayer"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-forest hover:border-amber hover:text-amber"
              >
                Prayer
              </Link>
              <Link
                href="/articles?category=scripture"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-forest hover:border-amber hover:text-amber"
              >
                Scripture
              </Link>
              <Link
                href="/articles?category=family"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-forest hover:border-amber hover:text-amber"
              >
                Family
              </Link>
              <Link
                href="/articles?category=leadership"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-forest hover:border-amber hover:text-amber"
              >
                Leadership
              </Link>
            </div>
          </section>
          <nav
            className="border border-border bg-surface p-6"
            aria-label="Related articles"
          >
            <h2 className="text-xs font-bold uppercase tracking-[.17em] text-forest">
              More articles
            </h2>
            <div className="mt-4 divide-y divide-border">
              {related?.length ? (
                related.map((item) => (
                  <Link
                    href={`/articles/${item.slug}`}
                    key={item.slug}
                    className="group block py-4 first:pt-0 last:pb-0"
                  >
                    <p className="font-serif text-xl leading-tight group-hover:text-amber">
                      {item.title}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink3">
                      {item.subtitle}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-ink3">
                  More articles will appear here.
                </p>
              )}
            </div>
            <Link
              href="/articles"
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
