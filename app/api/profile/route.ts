
import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const db = getServerClient()
  const { fid, username, avatar_url } = await req.json()

  if (!fid || !username) {
    return NextResponse.json({ error: 'missing fid/username' }, { status: 400 })
  }

  const { data, error } = await db
    .from('profiles')
    .upsert({ fid, username, avatar_url }, { onConflict: 'fid' })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
