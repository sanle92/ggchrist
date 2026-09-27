import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const inputSchema = z.object({
  contentType: z.enum(['article', 'teaching']),
  contentId: z.string().uuid(),
  viewerKey: z.string().uuid(),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid view request.' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('record_content_view', {
    p_content_type: parsed.data.contentType,
    p_content_id: parsed.data.contentId,
    p_viewer_key: parsed.data.viewerKey,
  });
  if (error) return NextResponse.json({ error: 'View tracking requires Migration 014.' }, { status: 503 });

  return NextResponse.json({ views: Number(data || 0) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
