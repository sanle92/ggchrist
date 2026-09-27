"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, ChevronDown, Heart, Mail, Menu, Search, Users, X, FileText, Info } from "lucide-react";
import { clsx } from "clsx";
import { ThemeToggle } from "@/components/theme-toggle";
import { useClickOutside } from "@/lib/use-click-outside";

const leftLinks = [
  ["Devotions", "/devotions", Book],
  ["Teachings", "/bible-teachings", Book],
  ["Articles", "/articles", FileText],
] as const;
const exploreLinks = [
  ["Ebooks", "/ebooks", Book],
  ["Community", "/community", Users],
  ["About", "/about", Info],
  ["Contact", "/contact", Mail],
] as const;

type LinkItem = readonly [string, string, typeof Book];

function BrandLogo({ mobile = false }: { mobile?: boolean }) {
  const size = mobile
    ? "h-auto w-[139px] lg:w-[245px] xl:w-[139px]"
    : "h-auto w-[220px] xl:w-[255px]";
  return (
    <>
      <img
        src="/images/logo-light.png"
        alt="Glorious Gospel of Christ"
        className={`theme-logo-light ${size}`}
      />
      <img
        src="/images/logo-dark.png"
        alt="Glorious Gospel of Christ"
        className={`theme-logo-dark ${size}`}
      />
    </>
  );
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  useClickOutside(exploreRef, () => setExploreOpen(false), exploreOpen);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const active = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const linkClass = (href: string) =>
    clsx(
      "relative py-2 text-[0.7rem] font-bold uppercase tracking-[0.11em] transition after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-amber after:transition-transform",
      active(href)
        ? "text-forest after:scale-x-100"
        : "text-ink3 after:scale-x-0 hover:text-forest hover:after:scale-x-100",
    );

  return (
    <>
      <div className="relative z-[52] overflow-hidden bg-brand text-white">
        <div className="marquee-track flex w-max whitespace-nowrap py-2 text-[0.57rem] font-bold uppercase tracking-[0.24em] text-white/68">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} className="flex items-center">
              <span className="mx-8 size-1 rounded-full bg-amber" /> Romans 1:16
              · Unashamed of the Gospel
            </span>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-forest/8 bg-cream/92 shadow-[0_8px_35px_rgba(18,38,58,.045)] backdrop-blur-xl">
        <div className="ggc-shell relative flex h-[78px] items-center justify-between lg:h-[68px]">
          <nav
            className="hidden items-center gap-7 lg:flex xl:gap-9"
            aria-label="Primary navigation"
          >
            {leftLinks.map(([label, href]) => (
              <Link key={href} href={href} className={linkClass(href)}>
                {label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setOpen(true)}
            className="grid size-11 place-items-center rounded-full text-forest lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <Link
            href="/"
            aria-label="Glorious Gospel of Christ home"
            className="absolute left-1/2 -translate-x-1/2"
          >
            <BrandLogo mobile />
          </Link>
          <nav
            className="hidden items-center justify-end gap-5 lg:flex xl:gap-7"
            aria-label="Secondary navigation"
          >
            <Link href="/community" className={linkClass("/community")}>
              Community
            </Link>
            <div ref={exploreRef} className="relative">
              <button
                type="button"
                onClick={() => setExploreOpen((value) => !value)}
                className="flex cursor-pointer items-center gap-1 py-2 text-[0.7rem] font-bold uppercase tracking-[0.11em] text-ink3 transition hover:text-forest"
                aria-expanded={exploreOpen}
              >
                Explore{" "}
                <ChevronDown
                  size={13}
                  className={`transition ${exploreOpen ? "rotate-180" : ""}`}
                />
              </button>
              {exploreOpen ? (
                <div className="absolute right-0 top-10 grid min-w-56 gap-1 border border-border bg-surface p-2 shadow-shadow2">
                  {exploreLinks.map(([label, href]) => (
                    <Link
                      onClick={() => setExploreOpen(false)}
                      key={href}
                      href={href}
                      className="px-4 py-3 text-sm font-semibold text-ink2 transition hover:bg-cream hover:text-forest"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <ThemeToggle />
            <Link href="/donate" className="btn-nav btn-amber min-h-10 px-5">
              <Heart size={13} fill="currentColor" /> Give
            </Link>
          </nav>
          <Link
            href="/donate"
            className="grid size-11 place-items-center rounded-full bg-amber text-white shadow-[0_8px_20px_rgba(255,131,0,.22)] lg:hidden"
            aria-label="Support the mission"
          >
            <Heart size={17} fill="currentColor" />
          </Link>
        </div>
      </header>
      <button
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className={clsx(
          "fixed inset-0 z-[60] bg-brand/55 backdrop-blur-sm transition lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-[70] flex w-[min(260px,75vw)] flex-col bg-cream shadow-2xl transition-transform duration-500 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[88px] items-center justify-between border-b border-border px-5">
          <BrandLogo mobile />
          <button
            onClick={() => setOpen(false)}
            className="grid size-10 place-items-center rounded-full border border-border"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="grid gap-1 overflow-y-auto p-5">
          {[...leftLinks, ...exploreLinks].map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active(href)
                  ? "bg-brand text-white"
                  : "text-ink2 hover:bg-surface",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={16} className="text-amber" />
                {label}
              </span>
              <span className="text-sm opacity-35">↗</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-border p-5">
          <p className="font-serif text-lg leading-tight text-forest">
            Truth that forms lives.
            <br />A family centered on Christ.
          </p>
          <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
            <Link href="/donate" className="btn-nav btn-amber text-xs">
              <Heart size={10} fill="currentColor" /> Give
            </Link>
            <ThemeToggle />
            <Link
              href="/articles"
              className="grid size-9 place-items-center border border-border bg-surface"
            >
              <Search size={15} />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
