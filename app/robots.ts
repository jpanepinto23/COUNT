import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/home', '/log', '/profile', '/history', '/connect'] }],
    sitemap: 'https://countfitness.app/sitemap.xml',
  }
}
