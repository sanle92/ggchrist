import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Glorious Gospel of Christ',
    short_name: 'GGChrist',
    description: 'Bible teachings, daily devotions, prayer, Christian ebooks and Gospel-centered community.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f3ea',
    theme_color: '#142b3f',
    categories: ['education', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
