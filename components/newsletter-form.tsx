'use client';

import { useActionState } from 'react';
import { subscribeNewsletter } from '@/app/newsletter/actions';

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, { message: '', success: false });
  return <form action={action} className="mt-5 grid gap-3 text-left">
    <label htmlFor="newsletter-email" className="text-sm text-white/70">Email newsletter</label>
    <input id="newsletter-email" name="email" type="email" autoComplete="email" required maxLength={320} placeholder="Your email address" className="w-full border border-white/25 bg-white/10 px-4 py-3 text-white placeholder:text-white/50" />
    <input name="website" aria-hidden="true" tabIndex={-1} autoComplete="off" className="hidden" />
    <button disabled={pending} className="btn-nav btn-amber w-full disabled:opacity-60">{pending ? 'Subscribing…' : 'Subscribe'}</button>
    <p role="status" aria-live="polite" className="text-sm text-white/80">{state.message}</p>
  </form>;
}
