import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import VisitTracker from '@/components/VisitTracker'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'COUNT: workouts that pay you back',
  description: 'Log a workout or sync from Strava, earn coins, redeem them for discounts and free product from NOBULL, Momentous, Thorne, and Trifecta. Free, no card.',
  metadataBase: new URL('https://www.countfitness.app'),
  openGraph: {
    title: 'COUNT: workouts that pay you back',
    description: 'Three workouts gets you a discount code from NOBULL, Momentous, or Thorne. Keep going and the creatine is free.',
    url: 'https://www.countfitness.app',
    siteName: 'COUNT',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COUNT: workouts that pay you back',
    description: 'Three workouts gets you a discount code from NOBULL, Momentous, or Thorne. Keep going and the creatine is free.',
    images: ['/og.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'COUNT',
  },
  other: {
    'impact-site-verification': 'd3eb117b-46ee-4809-9fcb-084371585fe3',
        'fo-verify': 'a3e83eb1-5bce-40cc-9fe8-18e6cfe34472',
  },
}

export const viewport: Viewport = {
  themeColor: '#111110',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistrar />
        <VisitTracker />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
