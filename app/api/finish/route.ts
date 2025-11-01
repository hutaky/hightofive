
import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const db = getServerClient()
  const { fid, username, avatar_url, reward } = await req.json()

  if (!fid || typeof reward !== 'number') {
    return NextResponse.json({ error: 'missing fid or reward' }, { status: 400 })
  }

  const { error: playErr } = await db
    .from('plays')
    .insert({ fid, reward, played_at: new Date().toISOString() })

  if (playErr) {
    return NextResponse.json({ error: playErr.message }, { status: 500 })
  }

  const { data: prof, error: profErr } = await db
    .from('profiles')
    .upsert({ fid, username, avatar_url }, { onConflict: 'fid' })
    .select('*')
    .single()

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  const points_total = (prof?.points_total ?? 0) + reward

  const { data: updated, error: updErr } = await db
    .from('profiles')
    .update({ points_total, last_play_at: new Date().toISOString() })
    .eq('fid', fid)
    .select('points_total')
    .single()

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ points_total: updated.points_total })
}
