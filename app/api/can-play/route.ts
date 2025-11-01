import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function isSameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth() === b.getUTCMonth() &&
         a.getUTCDate() === b.getUTCDate()
}

function secondsUntilMidnightUTC() {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fid = Number(url.searchParams.get('fid') || 0)
  if (!fid) return NextResponse.json({ canPlay: true, seconds: secondsUntilMidnightUTC() })

  const db = supabaseServer()
  const { data } = await db.from('dig_profiles').select('last_play_at').eq('fid', fid).maybeSingle()

  if (!data?.last_play_at) {
    return NextResponse.json({ canPlay: true, seconds: secondsUntilMidnightUTC() })
  }

  const last = new Date(data.last_play_at)
  const now = new Date()
  const can = !isSameUTCDate(last, now)
  return NextResponse.json({ canPlay: can, seconds: secondsUntilMidnightUTC() })
}
