
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fid = Number(searchParams.get('fid'))
  const username = searchParams.get('username') ?? undefined
  const pfp_url = searchParams.get('pfp') ?? undefined

  if (!fid) return NextResponse.json({ error: 'missing fid' }, { status: 400 })

  const { data: existing } = await supabase.from('profiles').select('*').eq('fid', fid).maybeSingle()
  if (!existing) {
    await supabase.from('profiles').upsert({ fid, username, pfp_url, games_left: 0 })
  } else if ((username && username !== existing.username) || (pfp_url && pfp_url !== existing.pfp_url)) {
    await supabase.from('profiles').update({ username, pfp_url }).eq('fid', fid)
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('fid', fid).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile: data })
}
