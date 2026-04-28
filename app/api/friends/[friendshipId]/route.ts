// PATCH  /api/friends/:friendshipId  { action: 'accept' | 'block' }  → respond to a request
// DELETE /api/friends/:friendshipId                                   → unfriend / cancel / decline

import { NextRequest, NextResponse } from 'next/server'
import { authedClient } from '@/lib/supabase-from-request'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ friendshipId: string }> }) {
  const auth = await authedClient(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth
  const { friendshipId } = await ctx.params

  const { action } = await req.json().catch(() => ({}))
  if (action !== 'accept' && action !== 'block') {
    return NextResponse.json({ error: 'action must be accept | block' }, { status: 400 })
  }

  // Only the receiver (friend_id) can accept/block.
  const { data: rowRaw, error: fetchErr } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .eq('id', friendshipId)
    .single()
  if (fetchErr || !rowRaw) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const row = rowRaw as { id: string; user_id: string; friend_id: string; status: string }
  if (row.friend_id !== userId) return NextResponse.json({ error: 'only receiver can respond' }, { status: 403 })
  if (row.status !== 'pending') return NextResponse.json({ error: 'request not pending' }, { status: 409 })

  const update = action === 'accept'
    ? { status: 'accepted', accepted_at: new Date().toISOString() }
    : { status: 'blocked' }

  const { error } = await supabase.from('friendships').update(update as never).eq('id', friendshipId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status: update.status })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ friendshipId: string }> }) {
  const auth = await authedClient(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth
  const { friendshipId } = await ctx.params

  // Either side can delete.
  const { data: rowRaw } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id')
    .eq('id', friendshipId)
    .single()
  if (!rowRaw) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const row = rowRaw as { id: string; user_id: string; friend_id: string }
  if (row.user_id !== userId && row.friend_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
