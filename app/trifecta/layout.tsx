import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Trifecta Challenge — COUNT',
  description: '12 verified workouts in August unlock 500 bonus coins, 50% off your first Trifecta order, and 10% off every order after. Free to join.',
  openGraph: {
    title: 'The Trifecta Challenge — Train consistently. Eat like it.',
    description: '12 verified workouts in August → 500 bonus coins + 50% off Trifecta. Aug 1–31 on COUNT.',
    url: 'https://countfitness.app/trifecta',
    siteName: 'COUNT',
    images: [{ url: '/trifecta-og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Trifecta Challenge — Train consistently. Eat like it.',
    description: '12 verified workouts in August → 500 bonus coins + 50% off Trifecta. Aug 1–31 on COUNT.',
    images: ['/trifecta-og.png'],
  },
}

export default function TrifectaLayout({ children }: { children: React.ReactNode }) {
  return children
}
