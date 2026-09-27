import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') || '/community';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/community';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/community?compose=auth&authError=${encodeURIComponent('Google sign-in could not be completed. Please try again.')}`, url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
