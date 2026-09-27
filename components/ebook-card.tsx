'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, X, Star } from 'lucide-react';

interface Ebook {
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  cover_image_url?: string;
  format?: string;
  price_minor?: number;
  currency?: string;
  rating?: number;
}

interface EbookCardProps {
  ebook: Ebook;
  index: number;
}

export function EbookCard({ ebook, index }: EbookCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const price = ebook.price_minor && ebook.currency
    ? `${ebook.currency} ${(ebook.price_minor / 100).toLocaleString()}`
    : 'Free';

  return (
    <>
      <article
        className="group grid min-h-[340px] grid-rows-[1fr_auto] cursor-pointer overflow-hidden border border-border bg-cream shadow-shadow transition hover:-translate-y-0.5 hover:shadow-shadow2"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative grid min-h-64 place-items-center overflow-hidden bg-[linear-gradient(145deg,#142b3f,#234b66)] p-7">
          <span className="absolute left-4 top-4 text-[.56rem] font-bold uppercase tracking-[.18em] text-white/55">
            {ebook.format || 'Digital book'}
          </span>
          {ebook.cover_image_url ? (
            <img
              src={ebook.cover_image_url}
              alt={`${ebook.title} cover`}
              className="h-52 w-36 object-cover shadow-2xl transition duration-500 group-hover:-translate-y-1"
            />
          ) : (
            <div className="grid h-52 w-36 place-items-center border border-white/15 bg-white/5">
              <BookOpen size={38} className="text-white/30" />
            </div>
          )}
          <span className="absolute bottom-4 right-4 font-serif text-5xl text-white/8">
            0{index + 1}
          </span>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-[.58rem] font-bold uppercase tracking-[.17em] text-amber">
              By {ebook.author}
            </p>
            {Number(ebook.rating) > 0 ? (
              <span className="flex items-center gap-1 text-xs font-bold text-amber">
                <Star size={12} fill="currentColor" /> {Number(ebook.rating).toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 font-serif text-2xl leading-none">{ebook.title}</h3>
          <p className="mt-3 line-clamp-2 text-xs leading-6 text-ink3">
            {ebook.subtitle || 'A Gospel-centered resource for spiritual growth.'}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="font-serif text-lg text-forest">{price}</span>
            <Link
              href={`/ebooks#${ebook.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="grid size-9 place-items-center bg-amber text-white transition hover:bg-amber/90"
              aria-label="View ebook details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-arrow-right"
                aria-hidden="true"
              >
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        </div>
      </article>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand/55 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="section-kicker">Ebook details</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="grid size-8 place-items-center rounded-full border border-border text-ink3 hover:bg-cream"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div className="aspect-[3/4] max-w-[200px] overflow-hidden rounded-xl bg-[linear-gradient(145deg,#142b3f,#234b66)] p-4">
                {ebook.cover_image_url ? (
                  <img
                    src={ebook.cover_image_url}
                    alt={`${ebook.title} cover`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen size={48} className="text-white/30" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[.58rem] font-bold uppercase tracking-[.17em] text-amber">
                  {ebook.format || 'Digital book'}
                </span>
                <h3 className="mt-4 font-serif text-3xl leading-tight">{ebook.title}</h3>
                <p className="mt-2 text-sm text-ink3">{ebook.subtitle}</p>
                <p className="mt-4 text-[.58rem] font-bold uppercase tracking-[.17em] text-amber">
                  By {ebook.author}
                </p>
                {Number(ebook.rating) > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-sm font-bold text-amber">
                    <Star size={14} fill="currentColor" /> {Number(ebook.rating).toFixed(1)}
                  </div>
                )}
                <div className="mt-auto pt-6">
                  <span className="font-serif text-2xl text-forest">{price}</span>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-nav btn-outline"
              >
                Close
              </button>
              <Link
                href={`/ebooks#${ebook.slug}`}
                onClick={() => setIsModalOpen(false)}
                className="btn-nav btn-amber"
              >
                View in library
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
