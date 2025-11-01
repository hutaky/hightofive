// Server + Client Supabase helpers

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY as string | undefined

// Client-side (browser)
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Server-side (API routes) – service role for upsert/update
export function supabaseServer() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}
