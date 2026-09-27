import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RichContent } from '@/components/rich-content';
import { absoluteUrl, breadcrumbJsonLd, contentMetadata, jsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };
async function getLesson(slug: string) {
  const supabase = await createClient();
  return (await supabase.from('kids_lessons').select('*').eq('slug', slug).eq('status', 'published').is('deleted_at', null).maybeSingle()).data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const item = await getLesson(slug);
  return item ? contentMetadata({ title: item.seo_title || item.title, description: item.seo_description || item.theme || item.content, path: `/bible-kids/${slug}`, canonicalUrl: item.canonical_url, imageUrl: item.cover_image_url, publishedAt: item.published_at, modifiedAt: item.updated_at, keywords: [item.focus_keyword, item.bible_book, 'Bible lessons for children'].filter(Boolean), noIndex: item.no_index }) : { title: 'Bible lesson not found' };
}

export default async function BibleKidsDetail({ params }: Props) {
  const { slug } = await params; const item = await getLesson(slug); if (!item) notFound();
  const schema = { '@context': 'https://schema.org', '@type': 'LearningResource', name: item.title, description: item.seo_description || item.theme, image: item.cover_image_url, educationalLevel: 'Children', learningResourceType: 'Bible lesson', about: item.bible_book, datePublished: item.published_at, dateModified: item.updated_at, url: absoluteUrl(`/bible-kids/${item.slug}`), provider: { '@id': `${absoluteUrl('/')}#organization` } };
  return <div className="ggc-shell py-10 md:py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Bible Kids', path: '/bible-kids' }, { name: item.title, path: `/bible-kids/${item.slug}` }])) }} />
    <Link href="/bible-kids" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-forest"><ArrowLeft size={15} /> Bible Kids</Link>
    <article className="mx-auto mt-8 max-w-4xl overflow-hidden border border-border bg-surface">
      {item.cover_image_url ? <img src={item.cover_image_url} alt={`${item.title} Bible lesson`} className="aspect-[16/8] w-full object-cover" /> : null}
      <div className="p-7 md:p-12"><p className="section-kicker">{item.week_label || 'Bible Kids'}{item.bible_book ? ` · ${item.bible_book}` : ''}</p><h1 className="mt-5 font-serif text-5xl leading-none md:text-7xl">{item.title}</h1>{item.theme ? <p className="mt-5 text-lg leading-8 text-ink3">{item.theme}</p> : null}<div className="prose mt-10 max-w-none"><RichContent content={item.content} /></div>{item.characters ? <p className="mt-10 border-t border-border pt-6 text-sm text-ink3"><BookOpen size={16} className="mr-2 inline text-amber" />Characters: {item.characters}</p> : null}</div>
    </article>
  </div>;
}
