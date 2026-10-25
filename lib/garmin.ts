// Garmin Health API (direct partner integration) — OAuth2 PKCE + REST helpers.
//
// Env vars (Vercel → count-fitness-app → Environment Variables):
//   GARMIN_CLIENT_ID       Consumer Key / Client ID from the Garmin Developer Portal
//   GARMIN_CLIENT_SECRET   Consumer Secret / Client Secret (shown once)
//
// Garmin pushes activity summaries to /api/garmin/webhooks (configure in the
// Developer Portal → API Tools → Endpoint Configuration → "Activities").

import { createHash, randomBytes } from 'crypto'

export const GARMIN_STATE_COOKIE = 'count_garmin_oauth'

const AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm'
const TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token'
const API_BASE = 'https://apis.garmin.com/wellness-api/rest'

export function garminConfigured(): boolean {
  return Boolean(process.env.GARMIN_CLIENT_ID && process.env.GARMIN_CLIENT_SECRET)
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://countfitness.app'
}

export function redirectUri(): string {
  return `${appUrl()}/api/garmin/callback`
}

// ---------- PKCE ----------

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function makePkce(): { verifier: string; challenge: string; state: string } {
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const state = base64url(randomBytes(16))
  return { verifier, challenge, state }
}

export function authorizeUrl(challenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GARMIN_CLIENT_ID!,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri(),
    state,
  })
  return `${AUTHORIZE_URL}?${params.toString()}`
}

// ---------- Tokens ----------

export interface GarminTokens {
  access_token: string
  refresh_token: string
  token_expires_at: string
  refresh_expires_at: string | null
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_token_expires_in?: number
  token_type?: string
  scope?: string
}

async function tokenRequest(body: Record<string, string>): Promise<GarminTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body).toString(),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Garmin token request failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = JSON.parse(text) as TokenResponse
  if (!json.access_token || !json.refresh_token) {
    throw new Error('Garmin token response missing tokens')
  }
  const now = Date.now()
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    token_expires_at: new Date(now + (json.expires_in ?? 86400) * 1000).toISOString(),
    refresh_expires_at: json.refresh_token_expires_in
      ? new Date(now + json.refresh_token_expires_in * 1000).toISOString()
      : null,
  }
}

export function exchangeCode(code: string, verifier: string): Promise<GarminTokens> {
  return tokenRequest({
    grant_type: 'authorization_code',
    client_id: process.env.GARMIN_CLIENT_ID!,
    client_secret: process.env.GARMIN_CLIENT_SECRET!,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
  })
}

export function refreshTokens(refreshToken: string): Promise<GarminTokens> {
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: process.env.GARMIN_CLIENT_ID!,
    client_secret: process.env.GARMIN_CLIENT_SECRET!,
    refresh_token: refreshToken,
  })
}

// ---------- REST ----------

async function api(path: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(init.headers ?? {}) },
    cache: 'no-store',
  })
}

/** Garmin's stable user identifier for this token. Webhook payloads carry it as `userId`. */
export async function fetchGarminUserId(accessToken: string): Promise<string> {
  const res = await api('/user/id', accessToken)
  if (!res.ok) throw new Error(`Garmin /user/id failed (${res.status})`)
  const json = (await res.json()) as { userId?: string }
  if (!json.userId) throw new Error('Garmin /user/id returned no userId')
  return json.userId
}

/**
 * Ask Garmin to push historical activity summaries to our webhook.
 * Returns 202 on success; the data arrives asynchronously. Best-effort.
 * Garmin caps a single backfill window at 90 days.
 */
export async function requestActivityBackfill(accessToken: string, startSec: number, endSec: number): Promise<boolean> {
  const qs = new URLSearchParams({
    summaryStartTimeInSeconds: String(Math.floor(startSec)),
    summaryEndTimeInSeconds: String(Math.floor(endSec)),
  })
  const res = await api(`/backfill/activities?${qs.toString()}`, accessToken).catch(() => null)
  return Boolean(res && (res.status === 202 || res.ok))
}

/** Revoke our access on Garmin's side. Garmin will also send a deregistration push. */
export async function deregisterUser(accessToken: string): Promise<void> {
  await api('/user/registration', accessToken, { method: 'DELETE' }).catch(() => {})
}

// ---------- Activity mapping ----------

/** Map a Garmin activityType (e.g. "RUNNING", "STRENGTH_TRAINING") to a COUNT workout type. */
export function mapGarminWorkoutType(activityType: string, activityName?: string): 'cardio' | 'hiit' | 'full_body' | 'custom' {
  const t = `${activityType ?? ''} ${activityName ?? ''}`.toLowerCase()
  if (/hiit|crossfit|interval|bootcamp|circuit/.test(t)) return 'hiit'
  if (/strength|weight|lifting|gym|resistance|bodyweight|pilates|yoga|mobility/.test(t)) return 'full_body'
  return 'cardio'
}

/** Human label for the workout note, e.g. "RUNNING" → "Running". */
export function prettyActivityType(activityType: string): string {
  return (activityType ?? 'Workout')
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
