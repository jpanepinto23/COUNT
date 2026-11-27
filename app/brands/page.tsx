import type { Metadata } from 'next'
import Link from 'next/link'
import { VERIFIED_POINTS, UNVERIFIED_POINTS } from '@/lib/points'
import { momentousOffer } from '@/lib/promos'

// Re-render hourly so time-boxed promo copy (lib/promos.ts) flips back on its own.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'COUNT for Brands',
  description: 'List a member discount on COUNT. Members earn coins from verified workouts and spend them on brand discounts.',
}

const SANS = 'Archivo, sans-serif'
const MONO = 'JetBrains Mono, monospace'
const COPPER = '#B5593C'
const INK = '#F5F0EA'
const MUTED = '#9A9087'
const LINE = '#222220'
const CONTACT = 'joseph.s.panepinto@countfitness.app'

// Confirmed live offers only. Keep in sync with the rewards table.
const LIVE = [
  { brand: 'NOBULL', offer: '30% off', coins: 600, workouts: '2 verified workouts', logo: 'https://cdn.brandfetch.io/nobullproject.com/w/256/h/256' },
  { brand: 'Momentous', offer: momentousOffer(), coins: 600, workouts: '2 verified workouts', logo: 'https://cdn.brandfetch.io/livemomentous.com/w/256/h/256' },
  { brand: 'Thorne', offer: '15% off', coins: 600, workouts: '2 verified workouts', logo: 'https://cdn.brandfetch.io/thorne.com/w/256/h/256' },
  { brand: 'Trifecta', offer: '50% off a first order', coins: 500, workouts: '1 verified workout', logo: 'https://cdn.brandfetch.io/trifectanutrition.com/w/256/h/256' },
]

const h2: React.CSSProperties = { fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 12, textWrap: 'balance' }
const body: React.CSSProperties = { color: MUTED, fontSize: 16, lineHeight: 1.65 }
const section: React.CSSProperties = { borderTop: `1px solid ${LINE}`, padding: '32px 0' }

export default function BrandsPage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#111110', color: INK }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px max(20px, env(safe-area-inset-right, 0px)) 56px max(20px, env(safe-area-inset-left, 0px))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ color: INK, textDecoration: 'none', fontFamily: SANS, fontWeight: 900, letterSpacing: '0.18em', fontSize: 15 }}>COUNT</Link>
          <a href={`mailto:${CONTACT}?subject=Listing%20on%20COUNT`} style={{ color: INK, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: SANS, padding: '8px 14px', borderRadius: 8, border: `1px solid ${LINE}` }}>Contact</a>
        </div>

        <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: COPPER, marginBottom: 12 }}>For brands</p>
        <h1 style={{ fontFamily: SANS, fontSize: 'clamp(30px, 8vw, 42px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5, marginBottom: 18, textWrap: 'balance' }}>
          Reach people who just finished a workout.
        </h1>

        {/* 1. The mechanic */}
        <div style={{ padding: '0 0 32px' }}>
          <div style={{ ...body, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p>
              COUNT members earn coins only by training: {VERIFIED_POINTS} for a workout verified through a Garmin or Strava sync,
              {' '}{UNVERIFIED_POINTS} for a logged one. They spend those coins on brand discounts in the COUNT store.
            </p>
            <p style={{ color: INK }}>
              This isn&rsquo;t influencer impressions. Everyone who sees your offer has put in real workouts to get there, and they&rsquo;re
              already buying in your category. When a member redeems, it&rsquo;s a purchase, not a click.
            </p>
          </div>
        </div>

        {/* 2. Who is live now */}
        <div style={section}>
          <h2 style={h2}>Live in the store now</h2>
          <div>
            {LIVE.map((r, i) => (
              <div key={r.brand} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
                <img src={r.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 7, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: SANS, fontWeight: 800, fontSize: 16 }}>{r.brand}</p>
                  <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.4 }}>{r.offer}</p>
                </div>
                <p style={{ fontFamily: MONO, fontSize: 12, color: COPPER, flexShrink: 0, textAlign: 'right', lineHeight: 1.5 }}>
                  {r.coins} coins<br /><span style={{ color: MUTED }}>{r.workouts}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2b. Partner links (no coins, no discount) */}
        <div style={section}>
          <h2 style={h2}>Partner</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
            <img src="https://cdn.brandfetch.io/kanefootwear.com/w/256/h/256" alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 7, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: SANS, fontWeight: 800, fontSize: 16 }}>KANE Footwear</p>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.4 }}>
                KANE Footwear &mdash; recovery shoes built for after the workout. Shop KANE through our partner link and you support COUNT at no extra cost to you.
              </p>
            </div>
            <a href="https://glnk.io/qv9ww/joseph-panepinto" target="_blank" rel="sponsored nofollow noopener" style={{ flexShrink: 0, color: INK, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: SANS, padding: '8px 14px', borderRadius: 8, border: `1px solid ${LINE}` }}>
              Shop KANE
            </a>
          </div>
        </div>

        {/* 3. How listing works */}
        <div style={section}>
          <h2 style={h2}>How listing works</h2>
          <ol style={{ ...body, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li>You give us a member discount code.</li>
            <li>We list it in the COUNT store at a coin price.</li>
            <li>When members buy through it, a commission comes back to COUNT.</li>
          </ol>
        </div>

        {/* 4. CTA */}
        <div style={{ ...section, textAlign: 'center' }}>
          <p style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, lineHeight: 1.25, marginBottom: 10, textWrap: 'balance' }}>
            Want your brand in front of people who train?
          </p>
          <p style={{ ...body, marginBottom: 20 }}>Send me a note and let&rsquo;s talk. &mdash;Joe, founder</p>
          <a href={`mailto:${CONTACT}?subject=Listing%20on%20COUNT`} style={{ display: 'inline-block', padding: '15px 28px', background: COPPER, color: INK, textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: SANS }}>
            Email Joe
          </a>
          <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginTop: 14, overflowWrap: 'anywhere', userSelect: 'all' }}>{CONTACT}</p>
        </div>

        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 24, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: MUTED, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Home</Link>
          <a href="/terms" style={{ color: MUTED, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Terms</a>
          <a href="/privacy" style={{ color: MUTED, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Privacy</a>
        </div>
        <p style={{ fontFamily: MONO, fontSize: 11, color: '#3A3A38', textAlign: 'center', lineHeight: 1.5, marginTop: 14 }}>
          Some links are partner/affiliate links &mdash; COUNT may earn a commission at no cost to you.
        </p>
      </div>
    </div>
  )
}
