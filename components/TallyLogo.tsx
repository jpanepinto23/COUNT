export default function TallyLogo({ size = 1 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 * size, justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 44 * size, height: 36 * size }}>
        {[6, 14, 22, 30].map((left, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: left * size,
              top: 4 * size,
              width: 4 * size,
              height: 28 * size,
              background: '#F5F0EA',
              borderRadius: 2,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: 16 * size,
            left: -2 * size,
            width: 48 * size,
            height: 3.5 * size,
            background: '#B5593C',
            borderRadius: 2,
            transform: 'rotate(-30deg)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 20 * size,
          fontWeight: 900,
          letterSpacing: 6 * size,
          textTransform: 'uppercase',
          color: '#F5F0EA',
        }}
      >
        COUNT
      </span>
    </div>
  )
}
