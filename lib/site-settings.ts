import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getSiteSettings = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle();
  if (error) console.error('Site settings unavailable', error.code);
  return data;
});
