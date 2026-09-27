import Link from "next/link";
import { ArrowRight, Instagram, Mail, MapPin, Youtube } from "lucide-react";

const links = [
  [
    "Discover",
    [
      ["Devotions", "/devotions"],
      ["Bible teachings", "/bible-teachings"],
      ["Articles", "/articles"],
      ["Ebooks", "/ebooks"],
    ],
  ],
  [
    "Connect",
    [
      ["Community", "/community"],
      ["Prayer wall", "/community?tab=prayers"],
      ["Contact", "/contact"],
    ],
  ],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#081827] text-white">
      <div className="ggc-shell py-14 md:py-20">
        <div className="grid gap-10 border-b border-white/10 pb-12 text-center lg:grid-cols-[1fr_1fr_1fr] lg:text-left">
          <div>
            <Link href="/" className="inline-flex p-1 justify-center lg:justify-start">
              <img
                src="/images/logo-dark.png"
                alt="Glorious Gospel of Christ"
                className="h-auto w-[138px]"
              />
            </Link>
            <p className="mt-6 mx-auto max-w-sm font-serif text-lg leading-7 text-white/70 lg:mx-0">
              Christian platform sharing biblical teachings, daily devotions,
              inspiring articles, ebooks, prayer, and community—helping people
              grow in faith and follow Jesus Christ.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 lg:justify-start">
              <a
                href="mailto:hello@ggchrist.org"
                className="grid size-10 place-items-center border border-white/15 text-white/60 hover:border-amber hover:text-amber"
                aria-label="Email"
              >
                <Mail size={16} />
              </a>
              <span className="grid size-10 place-items-center border border-white/15 text-white/60">
                <Instagram size={16} />
              </span>
              <span className="grid size-10 place-items-center border border-white/15 text-white/60">
                <Youtube size={17} />
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-center lg:text-left">
            {links.map(([title, items]) => (
              <div key={title} className="text-center lg:text-left">
                <h2 className="text-[.62rem] font-bold uppercase tracking-[.22em] text-amber3">
                  {title}
                </h2>
                <ul className="mt-6 space-y-4">
                  {items.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-white/55 transition hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center lg:text-left">
            <h2 className="text-[.62rem] font-bold uppercase tracking-[.22em] text-amber3">
              Stay in the Word
            </h2>
            <p className="mt-6 text-sm leading-7 text-white/55">
              Begin with today’s Scripture, then continue with reflection, audio
              and prayer.
            </p>
            <Link href="/devotions" className="btn-nav btn-amber mt-5 w-full">
              Open today’s devotion <ArrowRight size={14} />
            </Link>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/35 lg:justify-start">
              <MapPin size={13} /> Sharing the Gospel worldwide
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-7 text-center text-[.61rem] uppercase tracking-[.14em] text-white/35 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Glorious Gospel of Christ</p>
          <div className="flex justify-center gap-5 sm:justify-start">
            <Link href="/about">Privacy</Link>
            <Link href="/about">Terms</Link>
            <span>Romans 1:16</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
