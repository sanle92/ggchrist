import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="ggc-shell grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.25em] text-amber">404</p>
        <h1 className="mt-4 font-serif text-5xl">This page could not be found.</h1>
        <p className="mt-4 text-ink3">The address may have changed or the page is no longer available.</p>
        <Link href="/" className="btn-nav btn-forest mt-8 inline-flex px-6 py-3">Return home</Link>
      </div>
    </section>
  );
}
