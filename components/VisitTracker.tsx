'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const ENDPOINT =
  'https://lqedpkevxwzopctpgxoe.supabase.co/functions/v1/trifecta-stats'

export default function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      let key = sessionStorage.getItem('count_session_key')
      if (!key) {
        key = crypto.randomUUID()
        sessionStorage.setItem('count_session_key', key)
      }
      const params = new URLSearchParams(window.location.search)
      const body = JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        session_key: key,
        utm_source: params.get('utm_source'),
      })
      // No custom headers -> no CORS preflight; endpoint parses body as JSON.
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {})
    } catch {
      // never break the app over analytics
    }
  }, [pathname])

  return null
}
