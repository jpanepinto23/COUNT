import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://countfitness.app'
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: base + '/trifecta', changeFrequency: 'weekly', priority: 0.9 },
    { url: base + '/auth/signup', changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/feedback', changeFrequency: 'monthly', priority: 0.3 },
    { url: base + '/privacy', changeFrequency: 'yearly', priority: 0.1 },
    { url: base + '/terms', changeFrequency: 'yearly', priority: 0.1 },
  ]
}
