// Helper: build a Supabase client scoped to the caller's bearer token so RLS
// applies as if the user were running the query themselves. Used by the
// friends / reactions / feed API routes.

import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Loosely-typed because the route helpers cast field-level results themselves.
// Using a SupabaseClient<any> avoids the schema-specific generics that fight
// our manual `as` casts in route handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthedSupabase = {
  supabase: any
  userId: string
}

export async function authedClient(req: NextRequest): Promise<AuthedSupabase | { error: string; status: number }> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 }
  }
  const token = auth.slice('Bearer '.length)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { error: 'Unauthorized', status: 401 }
  }
  return { supabase, userId: data.user.id }
}
