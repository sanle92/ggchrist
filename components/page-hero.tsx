type PageHeroProps = { eyebrow: string; title: string; description: string };

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return <section className="relative overflow-hidden border-b border-forest/8 bg-cream2"><div className="pointer-events-none absolute -right-24 -top-48 size-[520px] rounded-full border border-amber/16" /><div className="pointer-events-none absolute -right-6 -top-28 size-[340px] rounded-full border border-forest/7" /><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,transparent_62%,rgba(255,131,0,.06)_62%,rgba(255,131,0,.06)_63%,transparent_63%)]" />
    <div className="ggc-shell relative py-12 md:py-16 lg:py-20"><div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end"><div className="max-w-4xl"><p className="section-kicker">{eyebrow}</p><h1 className="mt-6 font-serif text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[.84] tracking-[-.05em] text-ink">{title}</h1></div><div className="border-l border-amber/40 pl-6"><p className="text-sm leading-7 text-ink3 md:text-base">{description}</p></div></div></div>
  </section>;
}
