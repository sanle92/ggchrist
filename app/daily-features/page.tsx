import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHero } from '@/components/page-hero';
import { contentMetadata } from '@/lib/seo';

export const metadata: Metadata = contentMetadata({ title: 'Verse of the Day', description: 'Read and reflect on daily Bible verses from Glorious Gospel of Christ.', path: '/daily-features', keywords: ['verse of the day', 'daily Bible verse', 'Scripture'] });
export const revalidate = 300;
export default async function DailyFeaturesPage() { const supabase = await createClient(); const { data } = await supabase.from('daily_features').select('feature_date,verse_book,verse_chapter,featured_verse,background_image_url').eq('status', 'published').order('feature_date', { ascending: false }).limit(60); return <><PageHero eyebrow="Daily Scripture" title="Verse of the Day" description="Return to God’s Word each day for truth, hope and faithful direction." /><section className="ggc-shell py-20 md:py-28"><div className="grid gap-5 md:grid-cols-2">{(data || []).map((item) => <Link key={item.feature_date} href={`/daily-features/${item.feature_date}`} className="border border-border bg-surface p-7 transition hover:border-amber"><time className="section-kicker">{item.feature_date}</time><h2 className="mt-4 font-serif text-3xl text-forest">{item.verse_book} {item.verse_chapter}</h2><p className="mt-4 line-clamp-4 leading-8 text-ink3">“{item.featured_verse}”</p></Link>)}</div></section></>; }
