import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EbookCheckout } from '@/components/ebook-checkout';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Secure Ebook Checkout', description: 'Complete your ebook order securely with Stripe.', robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ ebook?: string; cancelled?: string }> }) {
  const params = await searchParams;
  if (!params.ebook) notFound();
  const supabase = await createClient();
  const { data: ebook } = await supabase.from('ebooks').select('id,slug,title,author,cover_image_url,price_minor,shipping_amount_minor,currency,format,file_path').eq('id', params.ebook).eq('status', 'published').maybeSingle();
  if (!ebook) notFound();
  return <EbookCheckout ebook={ebook} cancelled={params.cancelled === 'true'} />;
}
