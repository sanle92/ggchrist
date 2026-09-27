import Link from 'next/link';

export default function OfflinePage() {
  return (
    <section className="ggc-shell grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-lg border border-border bg-surface p-8 md:p-12">
        <p className="section-kicker">You are offline</p>
        <h1 className="mt-5 font-serif text-5xl leading-none">Reconnect to continue</h1>
        <p className="mt-5 leading-7 text-ink3">
          This page is not available without an internet connection. Previously loaded static resources remain available.
        </p>
        <Link href="/" className="btn-nav mt-7 bg-forest text-white">Try the homepage</Link>
      </div>
    </section>
  );
}
