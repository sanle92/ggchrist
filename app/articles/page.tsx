import type { Metadata } from 'next';
import { ContentCard } from '@/components/content-card';
import { EmptyContent } from '@/components/empty-content';
import { PageHero } from '@/components/page-hero';
import { createClient } from '@/lib/supabase/server';
import { contentMetadata } from '@/lib/seo';

export const metadata: Metadata = contentMetadata({ title: 'Christian Articles', description: 'Read Gospel-centered articles about faith, prayer, grace, salvation and Christian living.', path: '/articles', imageUrl: '/images/premium-bible-hero.webp', keywords: ['Christian articles', 'biblical living', 'faith', 'prayer', 'discipleship'] });
export const revalidate = 300;

export default async function ArticlesPage() {
  const supabase = await createClient();
  const { data: articles } = await supabase.from('articles').select('slug, title, excerpt, category, cover_image_url, published_at').eq('status', 'published').order('published_at', { ascending: false });
  return <><PageHero eyebrow="Gospel journal" title="Articles for a growing faith" description="Biblical truth, practical encouragement and testimonies pointing every heart to Jesus Christ." /><section className="ggc-shell py-20 md:py-28"><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{articles?.length ? articles.map((article) => <ContentCard key={article.slug} href={`/articles/${article.slug}`} eyebrow={article.category} title={article.title} excerpt={article.excerpt} imageUrl={article.cover_image_url} />) : <EmptyContent message="Published articles will appear here." />}</div></section></>;
}
