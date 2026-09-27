'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0),
});

export async function submitContact(formData: FormData) {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/contact?error=Please%20check%20the%20form%20and%20try%20again');
  const supabase = await createClient();
  const { website: _, ...message } = parsed.data;
  const { error } = await supabase.from('contact_messages').insert({ first_name: message.firstName, last_name: message.lastName || null, email: message.email, phone: message.phone || null, subject: message.subject, message: message.message, status: 'new' });
  if (error) redirect('/contact?error=Your%20message%20could%20not%20be%20sent');
  redirect('/contact?sent=true');
}
