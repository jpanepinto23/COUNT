// GET  /api/friends                  → list my friends + incoming/outgoing pending
// POST /api/friends   { friend_id }  → send a friend request

import { NextRequest, NextResponse } from 'next/server'
import { authedClient } from '@/lib/supabase-from-request'

export async function GET(req: NextRequest) {
  const auth = await authedClient(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at, accepted_at, ' +
            'requester:users!friendships_user_id_fkey (id, name, avatar_url, current_streak), ' +
            'receiver:users!friendships_friend_id_fkey (id, name, avatar_url, current_streak)')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accepted: any[] = []
  const incoming: any[] = []
  const outgoing: any[] = []
  for (const r of (rows ?? []) as any[]) {
    const isMine = r.user_id === userId
    const other = isMine ? r.receiver : r.requester
    const item = { id: r.id, status: r.status, friend: other, since: r.accepted_at ?? r.created_at }
    if (r.status === 'accepted') accepted.push(item)
    else if (r.status === 'pending' && !isMine) incoming.push(item)
    else if (r.status === 'pending' && isMine) outgoing.push(item)
  }

  return NextResponse.json({ accepted, incoming, outgoing })
}

export async function POST(req: NextRequest) {
  const auth = await authedClient(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth

  const { friend_id } = await req.json().catch(() => ({}))
  if (!friend_id || typeof friend_id !== 'string') {
    return NextResponse.json({ error: 'friend_id required' }, { status: 400 })
  }
  if (friend_id === userId) {
    return NextResponse.json({ error: 'cannot friend yourself' }, { status: 400 })
  }

  // If a row already exists in either direction, surface it (auto-accept if reciprocal).
  const { data: existingRaw } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${userId})`)
    .maybeSingle()
  const existing = existingRaw as { id: string; user_id: string; friend_id: string; status: string } | null

  if (existing) {
    // If the other side already requested me, accept it.
    if (existing.user_id === friend_id && existing.status === 'pending') {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() } as never)
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, status: 'accepted', id: existing.id })
    }
    return NextResponse.json({ ok: true, status: existing.status, id: existing.id })
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id, status: 'pending' } as never)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...(data as { id: string; status: string }) })
}
