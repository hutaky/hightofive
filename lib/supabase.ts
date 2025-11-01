"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnon = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnon);

type DailyStatus = {
  freeAvailable: boolean;
  extraGames: number;
};

export async function getProfile(fid: number, username?: string, pfp_url?: string) {
  // létrehozás/frissítés profiles táblában
  await supabase
    .from("profiles")
    .upsert({ fid, username, pfp_url }, { onConflict: "fid" });
}

export async function getDailyStatus(fid: number): Promise<DailyStatus> {
  // nézzük, játszott-e ma
  const today = new Date();
  today.setHours(0,0,0,0);
  const fromISO = today.toISOString();

  const playedToday = await supabase
    .from("dig_sessions")
    .select("id")
    .eq("fid", fid)
    .gte("created_at", fromISO)
    .limit(1)
    .maybeSingle();

  const inv = await supabase
    .from("inventory")
    .select("extra_games")
    .eq("fid", fid)
    .maybeSingle();

  const extra = inv.data?.extra_games ?? 0;
  const alreadyPlayed = Boolean(playedToday.data);
  return {
    freeAvailable: !alreadyPlayed,
    extraGames: extra
  };
}

export async function consumeOneGame(fid: number) {
  const daily = await getDailyStatus(fid);
  if (daily.freeAvailable) {
    // free game "fogyasztása" automatikus a session mentésekor
    return;
  }
  if (daily.extraGames > 0) {
    // csökkentünk egyet
    await supabase
      .from("inventory")
      .update({ extra_games: daily.extraGames - 1 })
      .eq("fid", fid);
  } else {
    throw new Error("No games available");
  }
}

export async function saveScore(args: { fid: number; score: number; moves: number; gemFound: boolean; }) {
  // fogyasztunk egy game-et (ha extra), free game esetén “játszott ma” lesz
  await consumeOneGame(args.fid);

  await supabase.from("dig_sessions").insert({
    fid: args.fid,
    score: args.score,
    moves: args.moves,
    gem_found: args.gemFound
  });

  // best_score frissítése összesített táblában (leaderboard gyorsításhoz)
  const best = await supabase
    .from("best_scores")
    .select("best_score")
    .eq("fid", args.fid)
    .maybeSingle();

  if (!best.data) {
    await supabase.from("best_scores").insert({ fid: args.fid, best_score: args.score });
  } else if (args.score > (best.data.best_score ?? 0)) {
    await supabase.from("best_scores").update({ best_score: args.score }).eq("fid", args.fid);
  }
}

export async function getLeaderboard() {
  // top 20 + profil adatok
  const { data: rows } = await supabase
    .from("best_scores")
    .select("fid,best_score,profiles:fid(username,pfp_url)")
    .order("best_score", { ascending: false })
    .limit(20);

  return (rows ?? []).map(r => ({
    fid: r.fid,
    best_score: r.best_score,
    username: (r as any).profiles?.username ?? null,
    pfp_url: (r as any).profiles?.pfp_url ?? null
  }));
}

export async function buyExtraGames(fid: number, count: number) {
  // Itt valós vásárlást érdemes onchain kezelni (Base), most: backend növeli a készletet
  const inv = await supabase
    .from("inventory")
    .select("extra_games")
    .eq("fid", fid)
    .maybeSingle();

  const current = inv.data?.extra_games ?? 0;
  const next = current + count;

  if (!inv.data) {
    await supabase.from("inventory").insert({ fid, extra_games: next });
  } else {
    await supabase.from("inventory").update({ extra_games: next }).eq("fid", fid);
  }
}
