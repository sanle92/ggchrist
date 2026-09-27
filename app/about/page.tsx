import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Cross,
  Globe2,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about the mission and beliefs of Glorious Gospel of Christ.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const values = [
    [
      BookOpen,
      "Scripture first",
      "The Bible is not decoration for our message—it is the foundation of everything we teach.",
    ],
    [
      Cross,
      "Christ at the center",
      "We point beyond ourselves to the finished work, living presence and promised return of Jesus.",
    ],
    [
      Users,
      "People over platforms",
      "Technology helps us gather, but love, truth and faithful relationship are the ministry.",
    ],
    [
      Globe2,
      "Hope without borders",
      "The Gospel belongs in every language, every home and every generation.",
    ],
  ];
  return (
    <>
      <PageHero
        eyebrow="Our heart"
        title="Jesus Christ is the center"
        description="We exist to proclaim the Gospel, form believers through Scripture, and make the love of Christ visible."
      />
      <section className="ggc-shell py-24 md:py-36">
        <div className="grid gap-14 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div>
            <p className="section-kicker">Why we exist</p>
            <h2 className="section-heading mt-6">
              Not simply content.
              <br />A call to become.
            </h2>
          </div>
          <div className="border-l border-amber/35 pl-7 md:pl-10">
            <p className="font-serif text-3xl leading-[1.25] text-forest md:text-4xl">
              We believe the Gospel does more than inspire a moment. It gives
              new life, reshapes identity, restores hope, and teaches ordinary
              people to walk with an extraordinary God.
            </p>
            <p className="mt-7 text-base leading-8 text-ink3">
              Glorious Gospel of Christ brings together daily devotion, careful
              Bible teaching, honest community, resources for children, and
              compassionate action. Every experience has one purpose: helping
              people see Jesus clearly and follow Him faithfully.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-brand py-24 text-white md:py-32">
        <div className="ggc-shell">
          <div className="grid gap-5 md:grid-cols-2">
            {values.map(([Icon, title, description], index) => {
              const ItemIcon = Icon as typeof BookOpen;
              return (
                <article
                  key={String(title)}
                  className="group rounded-[2rem] border border-white/10 bg-white/[.035] p-8 transition hover:border-amber/40 hover:bg-white/[.06] md:p-10"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-amber/12 text-amber3">
                      <ItemIcon size={22} />
                    </span>
                    <span className="font-serif text-5xl text-white/6">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="mt-16 font-serif text-4xl">{String(title)}</h2>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-white/48">
                    {String(description)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="ggc-shell py-24 md:py-36">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[8rem_8rem_2rem_2rem] bg-brand">
            <img
              src="/images/premium-bible-hero.webp"
              alt="Bible open in warm light"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand/65 to-transparent" />
            <p className="absolute bottom-8 left-8 right-8 font-serif text-3xl leading-tight text-white">
              “For I am not ashamed of the Gospel…”
            </p>
          </div>
          <div className="lg:pl-10">
            <Sparkles size={24} className="text-amber" />
            <p className="section-kicker mt-7">What we believe</p>
            <h2 className="section-heading mt-6">
              The Gospel changes everything.
            </h2>
            <div className="mt-8 grid gap-5 text-sm leading-7 text-ink3">
              <p>
                <strong className="text-forest">Jesus Christ:</strong> fully God
                and fully man, crucified for sin, risen in victory, reigning now
                and returning again.
              </p>
              <p>
                <strong className="text-forest">Holy Scripture:</strong> God’s
                trustworthy Word and our final authority for belief, character
                and life.
              </p>
              <p>
                <strong className="text-forest">The Holy Spirit:</strong>{" "}
                present and active, bringing new birth, forming holiness and
                empowering witness.
              </p>
              <p>
                <strong className="text-forest">The Church:</strong> one family
                in Christ, called to worship, disciple, serve and proclaim.
              </p>
            </div>
            <Link href="/bible-teachings" className="btn-nav btn-forest mt-9">
              Explore our teaching <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="ggc-shell pb-24 md:pb-36">
        <div className="rounded-[2.75rem] bg-amber px-7 py-16 text-center text-white md:px-14 md:py-24">
          <Heart size={28} fill="currentColor" className="mx-auto" />
          <h2 className="mx-auto mt-6 max-w-3xl font-serif text-5xl leading-[.95] md:text-7xl">
            There is a place for your story in this family.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70">
            Come learn, pray, ask, testify, give, and grow alongside people who
            are looking to Jesus.
          </p>
          <Link
            href="/community"
            className="btn-nav mt-9 bg-white px-8 text-amber2"
          >
            Join the community <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
