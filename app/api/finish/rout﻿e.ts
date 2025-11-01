import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function isSameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth() === b.getUTCMonth() &&
         a.getUTCDate() === b.getUTCDate()
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { fid, username, avatar_url, reward } = body as {
    fid?: number; username?: string; avatar_url?: string; reward?: number
  }
  if (!fid || typeof reward !== 'number') return NextResponse.json({ error: 'bad input' }, { status: 400 })

  const db = supabaseServer()

  // read existing
  const { data: prof } = await db.from('dig_profiles').select('*').eq('fid', fid).maybeSingle()

  const now = new Date()
  if (prof?.last_play_at && isSameUTCDate(new Date(prof.last_play_at), now)) {
    // already played today – do not double count
    return NextResponse.json({ points_total: prof.points_total ?? 0 })
  }

  const newTotal = (prof?.points_total ?? 0) + reward

  const { data, error } = await db
    .from('dig_profiles')
    .upsert(
      {
        fid,
        username: username ?? prof?.username,
        avatar_url: avatar_url ?? prof?.avatar_url,
        points_total: newTotal,
        last_play_at: now.toISOString(),
      },
      { onConflict: 'fid', ignoreDuplicates: false }
    )
    .select('points_total')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ points_total: data.points_total })
}
