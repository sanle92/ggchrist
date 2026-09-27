import type { Metadata, Viewport } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { getPublicEnv } from '@/lib/env';
import { jsonLd } from '@/lib/seo';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();

export const metadata: Metadata = {
  metadataBase: new URL(NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'Glorious Gospel of Christ',
    template: '%s | Glorious Gospel of Christ',
  },
  description: 'Bible teachings, daily devotions, Christian articles, prayer and Gospel-centered community.',
  applicationName: 'Glorious Gospel of Christ',
  authors: [{ name: 'Glorious Gospel of Christ', url: NEXT_PUBLIC_SITE_URL }],
  creator: 'Glorious Gospel of Christ',
  publisher: 'Glorious Gospel of Christ',
  category: 'Christian ministry',
  keywords: ['Gospel', 'Bible teaching', 'Christian devotions', 'prayer', 'discipleship', 'Christian ebooks'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: {
    type: 'website',
    siteName: 'Glorious Gospel of Christ',
    title: 'Glorious Gospel of Christ',
    description: 'Sharing the Gospel and helping every generation grow in the Word of God.',
    url: '/',
    images: [{ url: '/images/premium-bible-hero.webp', width: 1672, height: 941, alt: 'Open Bible in warm morning light' }],
  },
  twitter: { card: 'summary_large_image', images: ['/images/premium-bible-hero.webp'] },
};

export const viewport: Viewport = { themeColor: '#142b3f' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${NEXT_PUBLIC_SITE_URL}/#organization`, name: 'Glorious Gospel of Christ', url: NEXT_PUBLIC_SITE_URL, logo: `${NEXT_PUBLIC_SITE_URL}/images/logo-light.png`, description: 'A Gospel-centered Christian ministry sharing Bible teaching, daily devotions, prayer and resources for every generation.' };
  const website = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${NEXT_PUBLIC_SITE_URL}/#website`, name: 'Glorious Gospel of Christ', url: NEXT_PUBLIC_SITE_URL, publisher: { '@id': `${NEXT_PUBLIC_SITE_URL}/#organization` }, inLanguage: 'en' };
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('ggc-theme')||((matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light')}catch(e){}" }} /></head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} />
        <SiteHeader />
        <PwaRegister />
        <AnalyticsTracker />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
