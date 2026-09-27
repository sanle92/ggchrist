"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface VerseOfDayProps {
  verse: string;
  reference: string;
  children?: React.ReactNode;
}

export function VerseOfDay({ verse, reference, children }: VerseOfDayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const MAX_CHARS = 80;
  const isLong = verse.length > MAX_CHARS;
  const displayVerse =
    isLong && !isModalOpen ? verse.slice(0, MAX_CHARS) + "..." : verse;

  return (
    <>
      <article className="flex min-h-[270px] flex-col border border-border bg-surface p-7 shadow-shadow">
        <span className="section-kicker">Verse of the day</span>
        <blockquote className="my-auto">
          <p className="font-serif text-[1.75rem] leading-[1.16] text-ink">
            "{displayVerse}"
          </p>
          <footer className="mt-6 text-[.63rem] font-bold uppercase tracking-[.2em] text-amber">
            {reference}
          </footer>
        </blockquote>
        <div className="mt-8 flex items-center gap-4">
          {isLong && !isModalOpen && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-[0.65rem] font-bold uppercase tracking-[.13em] text-forest hover:underline"
            >
              Read more
            </button>
          )}
        </div>
        {children}
      </article>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand/55 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="section-kicker">Verse of the day</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="grid size-8 place-items-center rounded-full border border-border text-ink3 hover:bg-cream"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <blockquote>
              <p className="font-serif text-2xl leading-[1.16] text-ink">
                "{verse}"
              </p>
              <footer className="mt-6 text-[.63rem] font-bold uppercase tracking-[.2em] text-amber">
                {reference}
              </footer>
            </blockquote>
          </div>
        </div>
      )}
    </>
  );
}
