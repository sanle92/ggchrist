'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, BookOpen, Download, Star, X, ShoppingCart } from 'lucide-react';

interface Ebook {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  description?: string;
  cover_image_url?: string;
  price_minor?: number;
  original_price_minor?: number;
  currency?: string;
  format?: string;
  pages?: number;
  language?: string;
  rating?: number;
  review_count?: number;
  preview_url?: string;
}

interface EbookCardFullProps {
  ebook: Ebook;
}

export function EbookCardFull({ ebook }: EbookCardFullProps) {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const router = useRouter();
  const price = ebook.price_minor && ebook.currency
    ? `${ebook.currency} ${(ebook.price_minor / 100).toLocaleString()}`
    : 'Free';
  const originalPrice = ebook.original_price_minor && ebook.currency
    ? `${ebook.currency} ${(ebook.original_price_minor / 100).toLocaleString()}`
    : null;
  const isPhysicalFormat = ebook.format?.toLowerCase().includes('paperback') || ebook.format?.toLowerCase().includes('hardcover');

  return (
    <>
      <article
        id={ebook.slug}
        className="group overflow-hidden rounded-[2rem] border border-border bg-surface shadow-shadow transition duration-500 hover:-translate-y-1 hover:shadow-shadow2"
      >
        <div
          className="relative grid min-h-[280px] cursor-pointer place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(255,131,0,.16),transparent_35%),linear-gradient(145deg,#18344a,#0e2133)] p-6"
          onClick={() => setIsPreviewModalOpen(true)}
        >
          <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[.58rem] font-bold uppercase tracking-[.16em] text-white/60">
            {ebook.format}
          </span>
          {ebook.cover_image_url ? (
            <img
              src={ebook.cover_image_url}
              alt={`${ebook.title} cover`}
              className="h-52 w-36 rotate-2 rounded-lg object-cover shadow-[0_25px_55px_rgba(0,0,0,.38)] transition duration-500 group-hover:rotate-0 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="grid h-52 w-36 place-items-center rounded-lg border border-white/10 bg-white/5 shadow-2xl">
              <BookOpen size={40} strokeWidth={1} className="text-white/25" />
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[.6rem] font-bold uppercase tracking-[.18em] text-amber">
              {ebook.language || 'English'}
              {ebook.pages ? ` · ${ebook.pages} pages` : ''}
            </p>
            {Number(ebook.rating) > 0 ? (
              <span className="flex items-center gap-1 text-xs font-bold text-amber">
                <Star size={13} fill="currentColor" /> {Number(ebook.rating).toFixed(1)}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 font-serif text-2xl leading-tight"><Link href={`/ebooks/${ebook.slug}`} className="hover:text-amber">{ebook.title}</Link></h2>
          <p className="mt-2 text-sm font-semibold text-forest">by {ebook.author}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-7 text-ink3">{ebook.description}</p>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="font-serif text-xl text-forest">{price}</p>
              {originalPrice ? (
                <p className="text-xs text-ink3 line-through">{originalPrice}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/checkout?ebook=${ebook.id}`);
                }}
                className="btn-nav btn-amber px-4 text-xs"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand/55 backdrop-blur-sm p-4"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            className="max-w-3xl rounded-2xl border border-border bg-surface p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="section-kicker">Ebook Preview</span>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="grid size-8 place-items-center rounded-full border border-border text-ink3 hover:bg-cream"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-8 md:grid-cols-[1fr_auto]">
              <div className="aspect-[3/4] max-w-[250px] overflow-hidden rounded-xl bg-[linear-gradient(145deg,#142b3f,#234b66)] p-6">
                {ebook.cover_image_url ? (
                  <img
                    src={ebook.cover_image_url}
                    alt={`${ebook.title} cover`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen size={64} className="text-white/30" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[.58rem] font-bold uppercase tracking-[.17em] text-amber">
                  {ebook.format || 'Digital book'}
                </span>
                <h3 className="mt-4 font-serif text-3xl leading-tight">{ebook.title}</h3>
                {ebook.subtitle && <p className="mt-2 text-sm text-ink3">{ebook.subtitle}</p>}
                <p className="mt-4 text-[.58rem] font-bold uppercase tracking-[.17em] text-amber">
                  By {ebook.author}
                </p>
                <p className="mt-3 text-[.6rem] font-bold uppercase tracking-[.18em] text-amber">
                  {ebook.language || 'English'}{ebook.pages ? ` · ${ebook.pages} pages` : ''}
                </p>
                {Number(ebook.rating) > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-sm font-bold text-amber">
                    <Star size={14} fill="currentColor" /> {Number(ebook.rating).toFixed(1)}
                    {ebook.review_count && <span className="text-xs text-ink3">({ebook.review_count} reviews)</span>}
                  </div>
                )}
                <p className="mt-4 text-sm leading-7 text-ink3">{ebook.description}</p>
                <div className="mt-auto pt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl text-forest">{price}</span>
                    {originalPrice && (
                      <span className="text-lg text-ink3 line-through">{originalPrice}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="btn-nav btn-outline"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  router.push(`/checkout?ebook=${ebook.id}`);
                }}
                className="btn-nav btn-amber"
              >
                <ShoppingCart size={14} /> Buy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
