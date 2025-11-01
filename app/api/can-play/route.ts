
import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

function secondsUntilMidnightUTC() {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fid = url.searchParams.get('fid')

  if (!fid) return NextResponse.json({ canPlay: false, seconds: secondsUntilMidnightUTC() })

  const db = getServerClient()

  const start = new Date()
  start.setUTCHours(0,0,0,0)
  const { data, error } = await db
    .from('plays')
    .select('id')
    .eq('fid', Number(fid))
    .gte('played_at', start.toISOString())
    .limit(1)

  if (error) {
    return NextResponse.json({ canPlay: true, seconds: secondsUntilMidnightUTC() })
  }

  const canPlay = (data?.length ?? 0) === 0
  return NextResponse.json({ canPlay, seconds: secondsUntilMidnightUTC() })
}
