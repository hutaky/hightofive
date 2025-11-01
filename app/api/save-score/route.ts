
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const fid = Number(body.fid)
  const points = Number(body.points)
  const digs_used = Number(body.digs_used || 0)
  const bombs_hit = Number(body.bombs_hit || 0)
  const gem_type = String(body.gem_type || 'blue')
  if (!fid || !Number.isFinite(points)) return NextResponse.json({ error: 'bad args' }, { status: 400 })

  await supabase.from('scores').insert({ fid, digs_used, bombs_hit, gem_type, points })

  const { data: existing } = await supabase.from('profiles').select('*').eq('fid', fid).single()
  if (existing) {
    const { data: up } = await supabase.from('profiles').update({ dig_points: (existing.dig_points ?? 0) + points }).eq('fid', fid).select('*').single()
    return NextResponse.json({ profile: up })
  }

  return NextResponse.json({ ok: true })
}
