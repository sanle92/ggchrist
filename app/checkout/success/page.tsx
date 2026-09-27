import type { Metadata } from 'next';
import { EbookPaymentStatus } from '@/components/ebook-payment-status';

export const metadata: Metadata = { title: 'Ebook order status', robots: { index: false, follow: false } };
export default async function EbookSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; token?: string }> }) { const params = await searchParams; return <section className="ggc-shell py-20"><EbookPaymentStatus sessionId={params.session_id} freeToken={params.token} /></section>; }
