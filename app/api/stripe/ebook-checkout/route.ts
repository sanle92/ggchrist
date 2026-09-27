import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeRequest } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const schema = z.object({
  ebookId: z.string().uuid(),
  buyerName: z.string().trim().min(1).max(150),
  buyerEmail: z.string().trim().email().max(320),
  buyerPhone: z.string().trim().max(50).optional(),
});

const shippingCountries = ['AU', 'BE', 'BR', 'CA', 'CI', 'DE', 'DK', 'ES', 'FI', 'FR', 'GB', 'GH', 'IE', 'IN', 'IT', 'JP', 'KE', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RW', 'SE', 'SG', 'UG', 'US', 'ZA'];

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please check your name and email address.' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: ebook, error: ebookError } = await supabase
    .from('ebooks')
    .select('id,slug,title,author,format,file_path,price_minor,shipping_amount_minor,currency,status')
    .eq('id', parsed.data.ebookId)
    .maybeSingle();
  if (ebookError) return NextResponse.json({ error: 'The ebook catalogue is temporarily unavailable.' }, { status: 503 });
  if (!ebook || ebook.status !== 'published') return NextResponse.json({ error: 'This ebook is not available.' }, { status: 404 });
  if (ebook.currency !== 'USD') return NextResponse.json({ error: 'This ebook must be priced in USD before checkout.' }, { status: 400 });

  const physical = ['Paperback', 'Hardcover'].includes(ebook.format);
  if (!physical && !ebook.file_path) return NextResponse.json({ error: 'The ebook file has not been uploaded yet. Please contact us.' }, { status: 409 });
  const itemAmount = Number(ebook.price_minor);
  const shippingAmount = physical ? Number(ebook.shipping_amount_minor || 0) : 0;
  const totalAmount = itemAmount + shippingAmount;
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) return NextResponse.json({ error: 'This ebook has an invalid price.' }, { status: 400 });

  const purchaseId = randomUUID();
  const providerReference = totalAmount === 0 ? `free_${randomUUID()}` : `initializing_${purchaseId}`;
  const { error: insertError } = await supabase.from('ebook_purchases').insert({
    id: purchaseId,
    ebook_id: ebook.id,
    buyer_name: parsed.data.buyerName,
    buyer_email: parsed.data.buyerEmail,
    buyer_phone: parsed.data.buyerPhone || null,
    amount_minor: totalAmount,
    currency: 'USD',
    status: 'pending',
    provider: totalAmount === 0 ? 'free' : 'stripe',
    provider_reference: providerReference,
    fulfillment_type: physical ? 'physical' : 'digital',
    fulfillment_status: 'pending',
  });
  if (insertError) return NextResponse.json({ error: 'The order could not be initialized.' }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (totalAmount === 0) {
    const token = randomBytes(32).toString('base64url');
    const { error } = await supabase.rpc('confirm_ebook_purchase', {
      p_provider_reference: providerReference,
      p_payment_intent_id: null,
      p_amount_minor: 0,
      p_currency: 'USD',
      p_shipping_address: null,
      p_download_token_hash: createHash('sha256').update(token).digest('hex'),
      p_download_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    if (error) return NextResponse.json({ error: 'Free ebook access could not be prepared.' }, { status: 500 });
    return NextResponse.json({ checkout_url: `${siteUrl}/checkout/success?token=${encodeURIComponent(token)}` });
  }

  try {
    const metadata = {
      payment_type: 'ebook', purchase_id: purchaseId, ebook_id: ebook.id,
      buyer_name: parsed.data.buyerName, buyer_email: parsed.data.buyerEmail,
      fulfillment_type: physical ? 'physical' : 'digital',
    };
    const params = new URLSearchParams({
      mode: 'payment',
      customer_email: parsed.data.buyerEmail,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?ebook=${ebook.id}&cancelled=true`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(itemAmount),
      'line_items[0][price_data][product_data][name]': ebook.title,
      'line_items[0][price_data][product_data][description]': `${ebook.format} by ${ebook.author}`,
      'line_items[0][quantity]': '1',
      ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`metadata[${key}]`, value])),
    });
    if (physical) {
      shippingCountries.forEach((country, index) => params.set(`shipping_address_collection[allowed_countries][${index}]`, country));
      if (shippingAmount > 0) {
        params.set('line_items[1][price_data][currency]', 'usd');
        params.set('line_items[1][price_data][unit_amount]', String(shippingAmount));
        params.set('line_items[1][price_data][product_data][name]', 'Shipping and handling');
        params.set('line_items[1][quantity]', '1');
      }
    }
    const session = await stripeRequest<{ id: string; url: string }>('/checkout/sessions', { method: 'POST', body: params });
    const { error: updateError } = await supabase.from('ebook_purchases').update({ provider_reference: session.id, updated_at: new Date().toISOString() }).eq('id', purchaseId);
    if (updateError) throw updateError;
    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    await supabase.from('ebook_purchases').update({ status: 'failed', fulfillment_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', purchaseId);
    console.error('Ebook checkout failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Secure checkout could not be opened.' }, { status: 500 });
  }
}
