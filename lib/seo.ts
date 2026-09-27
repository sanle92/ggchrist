import { getPublicEnv } from '@/lib/env';
import type { Metadata } from 'next';

export function absoluteUrl(path = '/') {
  return new URL(path, getPublicEnv().NEXT_PUBLIC_SITE_URL).toString();
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function seoText(value: unknown, maxLength = 165) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#x20;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function contentMetadata(input: {
  title: string;
  description: unknown;
  path: string;
  canonicalUrl?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  author?: string | null;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const description = seoText(input.description) || 'Gospel-centered Christian content from Glorious Gospel of Christ.';
  const canonical = input.canonicalUrl || input.path;
  const images = input.imageUrl ? [{ url: input.imageUrl, alt: input.imageAlt || input.title }] : [];
  return {
    title: input.title,
    description,
    alternates: { canonical },
    authors: input.author ? [{ name: input.author }] : undefined,
    keywords: input.keywords?.filter(Boolean),
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: input.publishedAt ? 'article' : 'website',
      title: input.title,
      description,
      url: canonical,
      images,
      ...(input.publishedAt ? { publishedTime: input.publishedAt, modifiedTime: input.modifiedAt || input.publishedAt } : {}),
    },
    twitter: { card: 'summary_large_image', title: input.title, description, images: input.imageUrl ? [input.imageUrl] : [] },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
