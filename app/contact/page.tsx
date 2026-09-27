import type { Metadata } from "next";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircleHeart,
  Send,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { submitContact } from "./actions";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Glorious Gospel of Christ for prayer, questions and ministry enquiries.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="A real conversation"
        title="We would love to hear from you"
        description="Prayer, partnership, questions, or a story on your heart—send it. A ministry team member will read your message."
      />
      <section className="ggc-shell grid gap-8 py-24 lg:grid-cols-[.72fr_1.28fr] lg:py-32">
        <aside className="grid content-start gap-5">
          <div className="rounded-[2.25rem] bg-brand p-8 text-white md:p-10">
            <MessageCircleHeart size={27} className="text-amber3" />
            <h2 className="mt-10 font-serif text-4xl leading-tight">
              Let’s begin with listening.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/50">
              You do not need perfect words. Tell us what matters, and our team
              will respond with care.
            </p>
            <div className="mt-10 grid gap-5 border-t border-white/10 pt-7 text-sm">
              <p className="flex gap-3 text-white/55">
                <Mail size={18} className="shrink-0 text-amber3" />
                <span>
                  <strong className="block text-white">Secure message</strong>
                  This form goes directly to the ministry Admin inbox.
                </span>
              </p>
              <p className="flex gap-3 text-white/55">
                <Clock3 size={18} className="shrink-0 text-amber3" />
                <span>
                  <strong className="block text-white">
                    Thoughtful response
                  </strong>
                  We aim to reply as soon as possible.
                </span>
              </p>
              <p className="flex gap-3 text-white/55">
                <MapPin size={18} className="shrink-0 text-amber3" />
                <span>
                  <strong className="block text-white">Serving globally</strong>
                  One Gospel, one family, across borders.
                </span>
              </p>
            </div>
          </div>
          <a
            href="/community?tab=prayers"
            className="group flex items-center justify-between rounded-[1.5rem] border border-border bg-surface p-5 text-sm font-bold text-forest shadow-shadow"
          >
            Looking for the prayer wall?
            <span className="grid size-10 place-items-center rounded-full bg-amber text-white transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              <ArrowUpRight size={16} />
            </span>
          </a>
        </aside>
        <div className="rounded-[2.25rem] border border-border bg-surface p-6 shadow-shadow md:p-10">
          {params.sent ? (
            <div className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              Thank you. Your message has been received.
            </div>
          ) : null}
          {params.error ? (
            <div className="mb-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {params.error}
            </div>
          ) : null}
          <div className="mb-8">
            <p className="section-kicker">Write to us</p>
            <h2 className="mt-4 font-serif text-4xl">What is on your heart?</h2>
          </div>
          <form action={submitContact} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[.08em] text-ink2">
                First name
                <input name="firstName" className="field" required />
              </label>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[.08em] text-ink2">
                Last name
                <input name="lastName" className="field" />
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[.08em] text-ink2">
                Email
                <input name="email" type="email" className="field" required />
              </label>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[.08em] text-ink2">
                Phone
                <input name="phone" className="field" />
              </label>
            </div>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[.08em] text-ink2">
              Subject
              <input
                name="subject"
                className="field"
                placeholder="How can we help?"
                required
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[.08em] text-ink2">
              Message
              <textarea
                name="message"
                rows={8}
                className="field-area"
                placeholder="Write freely…"
                required
              />
            </label>
            <input
              name="website"
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
            <button
              className="btn-nav btn-amber justify-self-start px-8"
              type="submit"
            >
              <Send size={15} /> Send message
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
