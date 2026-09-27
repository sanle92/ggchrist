'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function subscribeNewsletter(_state: { message: string; success: boolean }, form: FormData) {
  const parsed = z.object({ email: z.string().trim().email().max(320), website: z.string().max(0) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { success: false, message: 'Please enter a valid email address.' };
  const supabase = await createClient();
  const { error } = await supabase.from('subscribers').insert({ email: parsed.data.email.toLowerCase(), status: 'active', source: 'footer' });
  // A duplicate must not reveal whether an address is subscribed or opted out.
  if (error && error.code !== '23505') {
    console.error('Newsletter signup failed', error.code);
    return { success: false, message: 'Signup is temporarily unavailable. Please try again later.' };
  }
  return { success: true, message: 'Thank you! Your signup request has been received.' };
}
