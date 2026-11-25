// Landing page when Garmin finishes the connection inside the Garmin Connect
// app's browser (iOS). The user is not signed in here, so just tell them
// it worked and send them back to COUNT.
export const metadata = { title: 'Garmin connected · COUNT' }

export default function GarminConnected() {
  return (
    <main style={{ minHeight: '100vh', background: '#0E0D0C', color: '#F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 360 }}>
        <h1 style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 24, marginBottom: 12 }}>Garmin connected</h1>
        <p style={{ opacity: 0.75, lineHeight: 1.5, marginBottom: 24 }}>
          You're all set. Close this window and head back to COUNT. Your Garmin workouts will verify automatically.
        </p>
        <a href="/profile" style={{ display: 'inline-block', background: '#C2410C', color: '#fff', padding: '12px 20px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
          Open COUNT
        </a>
      </div>
    </main>
  )
}
