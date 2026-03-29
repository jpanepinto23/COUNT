'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface Redemption {
  id: string
  redeemed_at: string
  points_spent: number
  user_name: string
  user_email: string
  product_name: string
  brand_name: string
  retail_value: number
}

const ADMIN_EMAIL = 'jpanepinto23@gmail.com'

function getBuyLink(productName: string, retailValue: number): string {
  const val = retailValue > 0 ? retailValue : (() => {
    const m = productName.match(/\$(\d+)/)
    return m ? parseInt(m[1]) : 10
  })()
  return `https://www.amazon.com/s?k=amazon+email+gift+card+${val}+dollars`
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.email !== ADMIN_EMAIL) { router.push('/home'); return }
    fetch('/api/admin/redemptions')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRedemptions(data); else setError('Failed to load') })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return <div style={{ padding: 24 }}>Loading...</div>
  if (user.email !== ADMIN_EMAIL) return null

  const pending = redemptions.filter(r => Date.now() - new Date(r.redeemed_at).getTime() < 72 * 3600 * 1000)

  return (
    <div style={{ padding: '24px 16px', fontFamily: 'sans-serif', maxWidth: '820px', margin: '0 auto', paddingBottom: 100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Redemptions Tracker</h1>
      <p style={{ color: '#8A8478', marginBottom: 24, fontSize: 14 }}>
        {loading ? 'Loading...' : `${pending.length} new (last 72h) \u00b7 ${redemptions.length} total`}
      </p>

      {error && <div style={{ color: '#B5593C', marginBottom: 16 }}>{error}</div>}
      {!loading && redemptions.length === 0 && !error && (
        <p style={{ color: '#8A8478' }}>No redemptions yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {redemptions.map(r => {
          const isNew = Date.now() - new Date(r.redeemed_at).getTime() < 72 * 3600 * 1000
          return (
            <div key={r.id} style={{
              border: isNew ? '1.5px solid #B5593C' : '1px solid #e0dbd5',
              borderRadius: 12,
              padding: 16,
              background: isNew ? '#FFF8F5' : '#fafaf9',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{r.product_name}</span>
                    {isNew && <span style={{ background: '#B5593C', color: 'white', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>NEW</span>}
                  </div>
                  <div style={{ color: '#8A8478', fontSize: 13 }}>
                    {r.brand_name}{r.retail_value > 0 ? ` \u00b7 $${r.retail_value} value` : ''} \u00b7 {r.points_spent.toLocaleString()} pts
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>{r.user_name}</span>
                    {' \u2022 '}
                    <a href={`mailto:${r.user_email}`} style={{ color: '#B5593C', textDecoration: 'none' }}>{r.user_email}</a>
                  </div>
                  <div style={{ color: '#8A8478', fontSize: 12, marginTop: 2 }}>
                    {new Date(r.redeemed_at).toLocaleString()}
                  </div>
                </div>
                <a
                  href={getBuyLink(r.product_name, r.retail_value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#FF9900', color: 'white',
                    padding: '10px 18px', borderRadius: 10,
                    fontWeight: 700, fontSize: 13,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  Buy &amp; Send &#8594;
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
