'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import BottomNav from '@/components/BottomNav'

function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/auth/login')
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0E0E0D',
      }}>
        <div style={{ textAlign: 'center' }}>
          <TallyLogo />
          <p style={{ color: '#8A8478', fontSize: 13, marginTop: 12, fontFamily: 'JetBrains Mono, monospace' }}>loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#0E0E0D', paddingBottom: 72 }}>
      {children}
      <BottomNav />
    </div>
  )
}

function TallyLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 44, height: 36 }}>
        {[6, 14, 22, 30].map((left, i) => (
          <div key={i} style={{ position: 'absolute', left, top: 4, width: 4, height: 28, background: '#F5F0EA', borderRadius: 2 }} />
        ))}
        <div style={{ position: 'absolute', top: 16, left: -2, width: 48, height: 3.5, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
      </div>
      <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 20, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase', color: '#F5F0EA' }}>COUNT</span>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
