
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const fid = Number(body.fid)
  if (!fid) return NextResponse.json({ error: 'missing fid' }, { status: 400 })

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('fid', fid).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().slice(0,10)
  if (profile.last_checkin && profile.last_checkin === today) {
    return NextResponse.json({ profile, alreadyCheckedIn: true })
  }

  let newStreak = 1
  if (profile.last_checkin) {
    const last = new Date(profile.last_checkin)
    const d = new Date()
    const diff = Math.floor((d.setHours(0,0,0,0) - last.setHours(0,0,0,0)) / (1000*60*60*24))
    if (diff === 1) newStreak = (profile.streak ?? 0) + 1
  }

  const updated = {
    streak: newStreak,
    last_checkin: today,
    games_left: (profile.games_left ?? 0) + 1,
    dig_points: (profile.dig_points ?? 0) + 5,
  }

  const { data: up, error: upErr } = await supabase.from('profiles').update(updated).eq('fid', fid).select('*').single()
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json({ profile: up, alreadyCheckedIn: false })
}
