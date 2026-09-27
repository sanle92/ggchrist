import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { stripeRequest } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const token = url.searchParams.get('token');
  if (!sessionId && !token) return NextResponse.json({ error: 'A valid download link is required.' }, { status: 400 });

  const supabase = createServiceClient();
  let query = supabase.from('ebook_purchases').select('id,status,fulfillment_type,download_expires_at,download_count,ebooks(title,file_path)');
  if (sessionId) {
    if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ error: 'Invalid checkout session.' }, { status: 400 });
    const session = await stripeRequest<{ payment_status: string; metadata?: Record<string, string> }>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status !== 'paid' || session.metadata?.payment_type !== 'ebook') return NextResponse.json({ error: 'This purchase has not been confirmed.' }, { status: 403 });
    query = query.eq('provider_reference', sessionId);
  } else {
    if (!token || token.length < 32) return NextResponse.json({ error: 'Invalid download token.' }, { status: 400 });
    query = query.eq('download_token_hash', createHash('sha256').update(token).digest('hex'));
  }

  const { data: purchase, error } = await query.maybeSingle();
  if (error || !purchase || purchase.status !== 'successful' || purchase.fulfillment_type !== 'digital') return NextResponse.json({ error: 'This ebook download is not available.' }, { status: 404 });
  if (purchase.download_expires_at && new Date(purchase.download_expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'This download link has expired. Please contact us for help.' }, { status: 410 });
  const ebook = purchase.ebooks as unknown as { title?: string; file_path?: string } | null;
  if (!ebook?.file_path) return NextResponse.json({ error: 'The ebook file is temporarily unavailable.' }, { status: 503 });

  const { data: signed, error: storageError } = await supabase.storage.from('ebooks').createSignedUrl(ebook.file_path, 60, { download: ebook.title || 'ebook' });
  if (storageError || !signed?.signedUrl) return NextResponse.json({ error: 'A secure download could not be created.' }, { status: 503 });
  await supabase.from('ebook_purchases').update({ download_count: Number(purchase.download_count || 0) + 1, last_downloaded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', purchase.id);
  return NextResponse.redirect(signed.signedUrl);
}
