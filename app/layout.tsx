import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'COUNT — Make It Count',
  description: 'Get rewarded for showing up. COUNT turns your gym sessions into real rewards.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'COUNT',
  },
  other: {
    'impact-site-verification': 'd3eb117b-46ee-4809-9fcb-084371585fe3',
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
