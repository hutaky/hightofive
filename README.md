
# DIGBASE (fixed)

## Env (Vercel → Settings → Environment Variables)
```
NEXT_PUBLIC_SITE_URL=https://hightofive.vercel.app
NEXT_PUBLIC_FARCASTER_CLIENT_ID=019a4028-dfcf-b1c8-8b38-475269708618
NEXT_PUBLIC_FARCASTER_REDIRECT_URI=https://hightofive.vercel.app
NEXT_PUBLIC_FARCASTER_DEEP_LINK_URL=farcaster://auth
NEXT_PUBLIC_FARCASTER_STATE=hightofive_auth_123

SUPABASE_URL=https://bnvzlbzhqqpdqjaxrlit.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE
NEXT_PUBLIC_SUPABASE_URL=https://bnvzlbzhqqpdqjaxrlit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# (optional) account association values
NEXT_PUBLIC_FC_HEADER=...
NEXT_PUBLIC_FC_PAYLOAD=...
NEXT_PUBLIC_FC_SIGNATURE=...
```

## Supabase tables
```
create table if not exists public.profiles (
  fid bigint primary key,
  username text not null,
  avatar_url text,
  points_total integer default 0 not null,
  last_play_at timestamptz
);

create table if not exists public.plays (
  id bigserial primary key,
  fid bigint not null,
  reward integer not null,
  played_at timestamptz not null default now()
);
```
