import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  // Payment callbacks and donor management remain available during maintenance.
  if (!path.startsWith('/api/stripe/') && !path.startsWith('/api/giving/') && !path.startsWith('/giving/') && !path.startsWith('/auth/')) {
    const { data: settings } = await supabase.from('site_settings').select('maintenance_mode,community_enabled,donations_enabled').eq('id', true).maybeSingle();
    const unavailable = settings?.maintenance_mode ||
      (settings?.community_enabled === false && (path === '/community' || path === '/api/engagement')) ||
      (settings?.donations_enabled === false && path === '/donate');
    if (unavailable) {
      const blocked = path.startsWith('/api/')
        ? NextResponse.json({ error: 'This feature is temporarily unavailable.' }, { status: 503 })
        : new NextResponse('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Temporarily unavailable</title><body><main><h1>We’ll be back soon</h1><p>This part of the website is temporarily unavailable. Please try again later.</p></main></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300' } });
      response.cookies.getAll().forEach(cookie => blocked.cookies.set(cookie));
      return blocked;
    }
  }
  return response;
}
