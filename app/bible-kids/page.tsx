import type { Metadata } from 'next';
import { EmptyContent } from '@/components/empty-content';
import { PageHero } from '@/components/page-hero';
import { ContentCard } from '@/components/content-card';
import { createClient } from '@/lib/supabase/server';
import { contentMetadata } from '@/lib/seo';

export const metadata: Metadata = contentMetadata({ title: 'Bible Lessons for Kids', description: 'Bible lessons created to help children know Jesus and enjoy God’s Word.', path: '/bible-kids', imageUrl: '/images/premium-bible-hero.webp', keywords: ['Bible lessons for kids', 'Sunday school', 'Christian children', 'kids Bible study'] });
export const revalidate = 300;
export default async function BibleKidsPage() { const supabase = await createClient(); const { data } = await supabase.from('kids_lessons').select('slug, title, theme, bible_book, cover_image_url').eq('status', 'published').is('deleted_at', null).order('published_at', { ascending: false }); return <><PageHero eyebrow="Faith for every generation" title="Bible Kids" description="Joyful, biblical lessons helping children discover God’s love and grow in faith." /><section className="ggc-shell py-20 md:py-28"><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data?.length ? data.map((item) => <ContentCard key={item.slug} href={`/bible-kids/${item.slug}`} eyebrow={item.bible_book || 'Kids lesson'} title={item.title} excerpt={item.theme} imageUrl={item.cover_image_url} />) : <EmptyContent message="Published children’s lessons will appear here." />}</div></section></>; }
