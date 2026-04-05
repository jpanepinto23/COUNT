'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/home',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#B5593C' : 'none'} stroke={active ? '#B5593C' : 'rgba(245,240,234,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    href: '/log',
    label: 'Log',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#B5593C' : 'rgba(245,240,234,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    center: true,
  },
  {
    href: '/rewards',
    label: 'Rewards',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#B5593C' : 'none'} stroke={active ? '#B5593C' : 'rgba(245,240,234,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v10H4V12"/>
        <path d="M22 7H2v5h20V7z"/>
        <path d="M12 22V7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'Board',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#B5593C' : 'rgba(245,240,234,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'History',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#B5593C' : 'rgba(245,240,234,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '448px',
        background: '#0E0E0D',
        borderTop: '1px solid rgba(245,240,234,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 0 8px',
                textDecoration: 'none',
                gap: '3px',
              }}
            >
              {tab.center ? (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#B5593C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -20,
                    boxShadow: '0 4px 16px rgba(181,89,60,0.45)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5F0EA" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              ) : (
                tab.icon(active)
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: active ? '#B5593C' : 'rgba(245,240,234,0.35)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
