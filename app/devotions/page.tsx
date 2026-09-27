import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentCard } from '@/components/content-card';
import { EmptyContent } from '@/components/empty-content';
import { PageHero } from '@/components/page-hero';
import { createClient } from '@/lib/supabase/server';
import { contentMetadata } from '@/lib/seo';

export const metadata: Metadata = contentMetadata({ title: 'Daily Christian Devotions', description: 'Daily Scripture, reflection and prayer to help you walk closely with Jesus.', path: '/devotions', imageUrl: '/images/premium-bible-hero.webp', keywords: ['daily devotion', 'Christian devotional', 'Bible reflection', 'prayer'] });
export const revalidate = 300;

const ITEMS_PER_PAGE = 10;

export default async function DevotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam || '1', 10);
  const supabase = await createClient();
  
  // Get total count for pagination
  const { count } = await supabase
    .from('devotions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .is('deleted_at', null);
  
  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 1;
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  
  // Get paginated data
  const { data } = await supabase
    .from('devotions')
    .select('slug, title, reflection, reference, cover_image_url, devotion_date')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('devotion_date', { ascending: false })
    .range(from, to);
  
  return (
    <>
      <PageHero 
        eyebrow="Daily bread" 
        title="Meet God in His Word" 
        description="Pause, read, reflect and pray with Scripture-centered daily devotions." 
      />
      <section className="ggc-shell px-6 py-12 md:px-0 md:py-20 lg:py-28">
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.length ? (
            data.map((item) => (
              <ContentCard 
                key={item.slug} 
                href={`/devotions/${item.slug}`} 
                eyebrow={item.reference || new Date(item.devotion_date).toLocaleDateString()} 
                title={item.title} 
                excerpt={item.reflection} 
                imageUrl={item.cover_image_url} 
              />
            ))
          ) : (
            <EmptyContent message="Published devotions will appear here." />
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            {currentPage > 1 && (
              <Link 
                href={`/devotions?page=${currentPage - 1}`}
                className="px-4 py-2 border border-border rounded-lg hover:bg-surface transition"
              >
                Previous
              </Link>
            )}
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Link
                key={pageNum}
                href={`/devotions?page=${pageNum}`}
                className={`px-4 py-2 border border-border rounded-lg transition ${
                  pageNum === currentPage 
                    ? 'bg-amber text-white border-amber' 
                    : 'hover:bg-surface'
                }`}
              >
                {pageNum}
              </Link>
            ))}
            
            {currentPage < totalPages && (
              <Link 
                href={`/devotions?page=${currentPage + 1}`}
                className="px-4 py-2 border border-border rounded-lg hover:bg-surface transition"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
