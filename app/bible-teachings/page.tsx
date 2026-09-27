import type { Metadata } from 'next';
import { ContentCard } from '@/components/content-card';
import { EmptyContent } from '@/components/empty-content';
import { PageHero } from '@/components/page-hero';
import { createClient } from '@/lib/supabase/server';
import { contentMetadata } from '@/lib/seo';

export const metadata: Metadata = contentMetadata({ title: 'Bible Teachings', description: 'Clear, practical Bible teaching for Christian growth and discipleship.', path: '/bible-teachings', imageUrl: '/images/premium-bible-hero.webp', keywords: ['Bible teachings', 'Bible study', 'Christian growth', 'discipleship'] });
export const revalidate = 300;
export default async function TeachingsPage() { const supabase = await createClient(); const { data } = await supabase.from('bible_teachings').select('slug, title, subtitle, cover_image_url, published_at').eq('status', 'published').order('published_at', { ascending: false }); return <><PageHero eyebrow="Study the Word" title="Bible teachings for everyday life" description="Explore biblical truth carefully, understand it clearly and put it into practice faithfully." /><section className="ggc-shell py-20 md:py-28"><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data?.length ? data.map((item) => <ContentCard key={item.slug} href={`/bible-teachings/${item.slug}`} eyebrow="Bible teaching" title={item.title} excerpt={item.subtitle} imageUrl={item.cover_image_url} />) : <EmptyContent message="Published Bible teachings will appear here." />}</div></section></>; }
