import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { fid, username, avatar_url } = body as { fid?: number; username?: string; avatar_url?: string }
  if (!fid) return NextResponse.json({ error: 'no fid' }, { status: 400 })

  const db = supabaseServer()

  // ensure table
try {
  await db.rpc('noop')
} catch (_) {}


  // upsert profile
  const { data, error } = await db
    .from('dig_profiles')
    .upsert(
      { fid, username, avatar_url, points_total: 0 },
      { onConflict: 'fid', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
