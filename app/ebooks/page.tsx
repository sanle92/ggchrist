import type { Metadata } from 'next';
import { ArrowUpRight, BookOpen, Download, LibraryBig, Star } from 'lucide-react';
import { EmptyContent } from '@/components/empty-content';
import { PageHero } from '@/components/page-hero';
import { EbookCardFull } from '@/components/ebook-card-full';
import { createClient } from '@/lib/supabase/server';
import { absoluteUrl, contentMetadata, jsonLd } from '@/lib/seo';

export const metadata: Metadata = contentMetadata({ title: 'Christian Ebooks', description: 'Discover Gospel-centered ebooks for spiritual growth and biblical learning.', path: '/ebooks', imageUrl: '/images/premium-bible-hero.webp', keywords: ['Christian ebooks', 'Bible study books', 'Christian books', 'discipleship resources'] });
export const revalidate = 300;

export default async function EbooksPage() {
  const supabase = await createClient(); const { data } = await supabase.from('ebooks').select('id,slug,title,subtitle,author,description,cover_image_url,price_minor,original_price_minor,currency,format,pages,language,rating,review_count,preview_url').eq('status', 'published').order('published_at', { ascending: false });
  const structuredData = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Christian ebooks from Glorious Gospel of Christ', itemListElement: (data || []).map((ebook, index) => ({ '@type': 'ListItem', position: index + 1, url: `${absoluteUrl('/ebooks')}#${ebook.slug}`, item: { '@type': 'Book', name: ebook.title, author: { '@type': 'Person', name: ebook.author }, image: ebook.cover_image_url, description: ebook.description, inLanguage: ebook.language, offers: { '@type': 'Offer', priceCurrency: ebook.currency, price: (Number(ebook.price_minor) / 100).toFixed(2), availability: 'https://schema.org/InStock' } } })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} /><PageHero eyebrow="The ministry library" title="Books to read slowly—and live deeply" description="Thoughtful Christian resources for personal study, discipleship, families and spiritual formation." />
    <section className="ggc-shell py-24 md:py-32"><div className="mb-12 flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end"><div><p className="section-kicker">Curated resources</p><h2 className="mt-5 font-serif text-4xl md:text-5xl">A shelf for the soul.</h2></div><p className="max-w-md text-sm leading-7 text-ink3">Every title is chosen to bring biblical clarity, faithful imagination, and practical formation into everyday life.</p></div><div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">{data?.length ? data.map((ebook) => <EbookCardFull key={ebook.id} ebook={ebook} />) : <EmptyContent message="Published ebooks will appear here in the library." />}</div></section>

    <section className="ggc-shell pb-24 md:pb-36"><div className="flex flex-col items-center rounded-[2.5rem] bg-amber px-7 py-16 text-center text-white"><LibraryBig size={30} /><h2 className="mt-6 font-serif text-5xl md:text-6xl">More resources are being written.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/72">Return often as the library grows with devotionals, studies and faith-building books for every season.</p></div></section>
  </>;
}
