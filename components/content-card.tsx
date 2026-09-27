import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';

type ContentCardProps = { href: string; eyebrow: string; title: string; excerpt?: string | null; imageUrl?: string | null };

export function ContentCard({ href, eyebrow, title, excerpt, imageUrl }: ContentCardProps) {
  return (
    <Link href={href} className="group flex h-full min-w-[280px] flex-row overflow-hidden rounded-[1.75rem] border border-forest/9 bg-surface shadow-shadow transition duration-500 hover:-translate-y-1.5 hover:shadow-shadow2 md:flex-col md:min-w-0">
      <div className="relative block aspect-[16/10] w-[120px] overflow-hidden bg-cream2 md:w-full md:aspect-[16/10]">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_75%_20%,rgba(255,131,0,.16),transparent_28%),linear-gradient(145deg,#f7f4ed,#e7e1d6)]">
            <BookOpen size={38} strokeWidth={1.1} className="text-forest/32" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/35 bg-white/88 px-2 py-0.5 text-[0.45rem] font-bold uppercase tracking-[0.18em] text-forest backdrop-blur md:left-4 md:top-4 md:px-2.5 md:py-1 md:text-[0.5rem] lg:left-5 lg:top-5 lg:px-3 lg:py-1.5 lg:text-[0.58rem]">
          {eyebrow}
        </span>
        <span className="absolute bottom-3 right-3 grid size-8 translate-y-3 place-items-center rounded-full bg-amber text-white opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:bottom-4 md:right-4 md:size-10 lg:bottom-5 lg:right-5 lg:size-11">
          <ArrowUpRight size={12} strokeWidth={2} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3 md:p-4 md:px-7 lg:p-6 lg:px-7">
        <h2 className="font-serif text-base font-medium leading-[1.05] tracking-[-0.025em] text-ink md:text-xl lg:text-[1.9rem]">
          {title}
        </h2>
        {excerpt ? (
          <p className="mt-2 line-clamp-3 text-[0.7rem] leading-4 text-ink3 md:mt-3 md:text-xs md:leading-5 lg:mt-4 lg:text-sm lg:leading-6">
            {excerpt}
          </p>
        ) : null}
        <div className="mt-auto inline-flex items-center gap-2 pt-3 text-[0.5rem] font-bold uppercase tracking-[0.17em] text-forest md:pt-5 md:text-[0.58rem] lg:pt-7 lg:text-[0.64rem]">
          Read the story <span className="h-px w-4 bg-amber transition-all group-hover:w-6 md:w-6 md:group-hover:w-9 lg:w-7 lg:group-hover:w-10" />
        </div>
      </div>
    </Link>
  );
}
