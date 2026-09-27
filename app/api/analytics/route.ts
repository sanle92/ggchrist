import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  sessionId: z.string().uuid(),
  visitorId: z.string().uuid(),
  eventType: z.enum(['page_view', 'heartbeat', 'donation_start', 'download']),
  path: z.string().min(1).max(500),
  referrer: z.string().max(1000).nullable().optional(),
  timezone: z.string().max(100).optional(),
  screenWidth: z.number().int().positive().max(100000).optional(),
});

function deviceDetails(userAgent: string) {
  const mobile = /android|iphone|ipod|mobile/i.test(userAgent);
  const tablet = /ipad|tablet/i.test(userAgent);
  const bot = /bot|crawler|spider|slurp/i.test(userAgent);
  const browser = /edg/i.test(userAgent) ? 'Edge' : /chrome|crios/i.test(userAgent) ? 'Chrome' : /firefox|fxios/i.test(userAgent) ? 'Firefox' : /safari/i.test(userAgent) ? 'Safari' : 'Other';
  const operatingSystem = /iphone|ipad|ipod/i.test(userAgent) ? 'iOS' : /android/i.test(userAgent) ? 'Android' : /windows/i.test(userAgent) ? 'Windows' : /mac os|macintosh/i.test(userAgent) ? 'macOS' : /linux/i.test(userAgent) ? 'Linux' : 'Other';
  return { deviceType: bot ? 'bot' : tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', browser, operatingSystem };
}

function decodedHeader(value: string | null) {
  if (!value) return null;
  try { return decodeURIComponent(value.replaceAll('+', ' ')); } catch { return value.slice(0, 100); }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ accepted: false }, { status: 400 });
  const userAgent = request.headers.get('user-agent') || '';
  const device = deviceDetails(userAgent);
  const countryCode = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || request.headers.get('x-country-code');
  const countryName = countryCode ? new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode : null;
  const city = decodedHeader(request.headers.get('x-vercel-ip-city') || request.headers.get('cf-ipcity') || request.headers.get('x-city'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('track_analytics', {
    p_session_id: parsed.data.sessionId,
    p_visitor_id: parsed.data.visitorId,
    p_event_type: parsed.data.eventType,
    p_path: parsed.data.path,
    p_referrer: parsed.data.referrer || null,
    p_country_code: countryCode,
    p_country_name: countryName,
    p_region: request.headers.get('x-vercel-ip-country-region') || request.headers.get('cf-region') || request.headers.get('x-region'),
    p_city: city,
    p_timezone: parsed.data.timezone || null,
    p_device_type: device.deviceType,
    p_browser: device.browser,
    p_operating_system: device.operatingSystem,
    p_screen_width: parsed.data.screenWidth || null,
  });
  if (error) {
    console.error('Analytics tracking failed', error.message);
    return NextResponse.json({ accepted: false, error: 'Analytics storage is unavailable. Confirm migrations 006 and 007 are applied.' }, { status: 503 });
  }
  return NextResponse.json({ accepted: true });
}
