'use client'

import { useState } from 'react'

const BG_CARD = '#181714'
const COPPER = '#B5593C'
const TEXT = '#F5F0EA'
const MUTED = '#8A8680'
const BORDER = 'rgba(245,240,234,0.10)'

const BRANDS = ['NOBULL', 'Momentous', 'Thorne', 'Trifecta']

interface BrandSurveyCardProps {
  onDismiss: () => void
}

export default function BrandSurveyCard({ onDismiss }: BrandSurveyCardProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [otherBrands, setOtherBrands] = useState('')
  const [localShops, setLocalShops] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleBrand(brand: string) {
    setSelected(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    )
  }

  async function submit(skipped: boolean) {
    setSubmitting(true)
    try {
      await fetch('/api/brand-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_brands: skipped ? [] : selected,
          other_brands: skipped ? '' : otherBrands,
          local_shops: skipped ? '' : localShops,
          skipped,
        }),
      })
    } catch {
      // best-effort; never block the user
    }
    onDismiss()
  }

  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 18,
      padding: '20px 20px 18px',
      fontFamily: 'var(--sans, Geist, system-ui, sans-serif)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{
            fontFamily: 'var(--mono, JetBrains Mono, monospace)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: COPPER,
            fontWeight: 700,
            marginBottom: 4,
          }}>
            Quick question
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
            Which brands do you buy every month?
          </div>
        </div>
        <button
          onClick={() => submit(true)}
          disabled={submitting}
          aria-label="Skip"
          style={{
            background: 'transparent',
            border: 'none',
            color: MUTED,
            fontSize: 20,
            cursor: 'pointer',
            padding: '0 0 0 12px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Brand chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {BRANDS.map(brand => {
          const active = selected.includes(brand)
          return (
            <button
              key={brand}
              onClick={() => toggleBrand(brand)}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: `1.5px solid ${active ? COPPER : BORDER}`,
                background: active ? 'rgba(181,89,60,0.14)' : 'transparent',
                color: active ? COPPER : MUTED,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {brand}
            </button>
          )
        })}
      </div>

      {/* Other brands */}
      <input
        type="text"
        placeholder="Other brands you buy regularly..."
        value={otherBrands}
        onChange={e => setOtherBrands(e.target.value)}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '11px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          color: TEXT,
          fontFamily: 'inherit',
          fontSize: 13,
          outline: 'none',
          marginBottom: 10,
          boxSizing: 'border-box',
        }}
      />

      {/* Local shops */}
      <input
        type="text"
        placeholder="Local shops near your gym..."
        value={localShops}
        onChange={e => setLocalShops(e.target.value)}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '11px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          color: TEXT,
          fontFamily: 'inherit',
          fontSize: 13,
          outline: 'none',
          marginBottom: 14,
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => submit(false)}
          disabled={submitting}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: COPPER,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {submitting ? 'Saving...' : 'Submit'}
        </button>
        <button
          onClick={() => submit(true)}
          disabled={submitting}
          style={{
            padding: '12px 18px',
            background: 'transparent',
            color: MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>

      <p style={{ fontSize: 11, color: MUTED, marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
        No personal data is shared. This helps us find the right brand partners.
      </p>
    </div>
  )
}
