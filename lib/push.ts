// Client-side push notification utility
// Setup: npm install web-push && npx web-push generate-vapid-keys
// Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to Vercel env vars

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return reg
  } catch {
    return null
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('Notification' in window) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await registerServiceWorker()
  if (!reg) return false

  try {
    // Check for existing subscription
    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — push not available')
        return false
      }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Save subscription to server
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
    })

    return res.ok
  } catch (err) {
    console.error('Push subscribe error:', err)
    return false
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}
