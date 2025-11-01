"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Diamond, Bomb, Pickaxe, Timer, Crown, Package, Plus, User2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDailyStatus, saveScore, getLeaderboard, buyExtraGames, getProfile } from "@/lib/supabase";
import { useFrame } from "@/components/farcaster-provider";

const GRID = 7;
const MAX_CLICKS = 30;
const BASE_REWARD = 250;

type Cell = "empty" | "gem" | "bomb";

type Board = {
  cells: Cell[];
  gemIndex: number;
  bombIndexes: number[];
};

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function generateBoard(): Board {
  const total = GRID * GRID;
  const cells: Cell[] = Array(total).fill("empty");

  const gemIndex = randInt(total);
  cells[gemIndex] = "gem";

  const bombs = new Set<number>();
  while (bombs.size < 3) {
    const i = randInt(total);
    if (i !== gemIndex && cells[i] === "empty") {
      cells[i] = "bomb";
      bombs.add(i);
    }
  }
  return { cells, gemIndex, bombIndexes: [...bombs] };
}

function timeUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function formatCountdown(ms: number) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function DigBaseApp() {
  const { context } = useFrame();
  const fid = context?.user?.fid;
  const username = context?.user?.username ?? "anon";
  const pfp = context?.user?.profile?.pfpUrl ?? "";

  const qc = useQueryClient();

  // profile (mentjük/olvassuk, hogy leaderboardon legyen név/kép)
  useEffect(() => {
    if (!fid) return;
    getProfile(fid, username, pfp).catch(() => {});
  }, [fid, username, pfp]);

  const { data: daily, isLoading: loadingDaily, refetch: refetchDaily } = useQuery({
    queryKey: ["daily-status", fid],
    queryFn: async () => {
      if (!fid) return null;
      return getDailyStatus(fid);
    },
    enabled: !!fid
  });

  const { data: lb, isLoading: loadingLb } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
    staleTime: 30_000
  });

  const [board, setBoard] = useState<Board | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [clicksLeft, setClicksLeft] = useState<number>(MAX_CLICKS);
  const [score, setScore] = useState<number>(BASE_REWARD);
  const [bombHits, setBombHits] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  const [countdown, setCountdown] = useState<number>(() => timeUntilMidnight());

  // visszaszámláló a következő napi free game-ig
  useEffect(() => {
    const t = setInterval(() => setCountdown(timeUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  // új játék indítása
  function newGame() {
    const b = generateBoard();
    setBoard(b);
    setRevealed(Array(GRID * GRID).fill(false));
    setClicksLeft(MAX_CLICKS);
    setScore(BASE_REWARD);
    setBombHits(0);
    setGameOver(false);
    setStatus("");
  }

  // ha van jogosultság (free vagy extra), automatikusan pályát hozunk létre
  useEffect(() => {
    if (!fid || loadingDaily) return;
    if (!daily) return;
    if ((daily.freeAvailable || daily.extraGames > 0) && !board) {
      newGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, loadingDaily, daily?.freeAvailable, daily?.extraGames]);

  const saveMutation = useMutation({
    mutationFn: async (finalScore: number) => {
      if (!fid) return;
      await saveScore({
        fid,
        score: finalScore,
        moves: MAX_CLICKS - clicksLeft,
        gemFound: revealed[board?.gemIndex ?? -1] === true
      });
    },
    onSettled: () => {
      refetchDaily();
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    }
  });

  function endGame(finalScore: number) {
    setGameOver(true);
    saveMutation.mutate(finalScore);
  }

  function clickCell(i: number) {
    if (gameOver || !board || revealed[i] || clicksLeft <= 0) return;

    const nextRev = [...revealed];
    nextRev[i] = true;
    setRevealed(nextRev);

    const cell = board.cells[i];

    if (cell === "gem") {
      // GEM: azonnali game over +100 bónusz
      const final = Math.max(0, score) + 100;
      setScore(final);
      setStatus("💎 Gem found! +100");
      endGame(final);
      return;
    }

    if (cell === "bomb") {
      // -10% (az aktuális score-ból, matematikai kerekítés)
      const loss = Math.round(score * 0.1);
      const ns = Math.max(0, score - loss);
      setScore(ns);
      setBombHits(b => b + 1);
      setStatus(`💣 Bomb hit! -${loss} (${bombHits + 1}x)`);
    } else {
      // üres: -1 pont
      setScore(s => Math.max(0, s - 1));
    }

    setClicksLeft(c => {
      const nc = c - 1;
      if (nc <= 0) {
        // pity reward: ha nincs GEM és elfogyott a 30 kattintás → 1 pont
        const gemRevealed = board.cells[board.gemIndex] === "gem" && nextRev[board.gemIndex];
        if (!gemRevealed) {
          const final = Math.max(1, score);
          setScore(final);
          setStatus("No moves left. Pity reward: 1");
          endGame(final);
        }
      }
      return nc;
    });
  }

  const canPlay = useMemo(() => {
    if (!daily) return false;
    return daily.freeAvailable || daily.extraGames > 0;
  }, [daily]);

  const freeOrExtraLabel = useMemo(() => {
    if (!daily) return "";
    if (daily.freeAvailable) return "Free game available";
    if (daily.extraGames > 0) return `${daily.extraGames} extra game(s)`;
    return "No games left";
  }, [daily]);

  const buyMutation = useMutation({
    mutationFn: async (count: number) => {
      if (!fid) return;
      await buyExtraGames(fid, count);
    },
    onSuccess: () => {
      refetchDaily();
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/60 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.9, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220 }}
              className="p-2 rounded-2xl bg-slate-800"
            >
              <Pickaxe className="w-5 h-5" />
            </motion.div>
            <div className="text-lg font-semibold">DigBase</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">v1</span>
          </div>

          <div className="flex items-center gap-3">
            {/* user badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
              {pfp ? (
                <img src={pfp} alt={username} className="w-6 h-6 rounded-full border border-slate-700" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                  <User2 className="w-4 h-4" />
                </div>
              )}
              <div className="text-sm">@{username}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 py-6 flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat title="Score" value={score} icon={<Crown className="w-4 h-4" />} />
          <Stat title="Clicks left" value={clicksLeft} icon={<Pickaxe className="w-4 h-4" />} />
          <Stat title="Bomb hits" value={bombHits} icon={<Bomb className="w-4 h-4" />} />
          <Stat title="Availability" value={freeOrExtraLabel} icon={<Package className="w-4 h-4" />} />
          <Stat title="Next free game" value={formatCountdown(countdown)} icon={<Timer className="w-4 h-4" />} />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (!canPlay) return;
              newGame();
            }}
            disabled={!canPlay}
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow"
          >
            {board && !gameOver ? "Restart Game" : "Start Game"}
          </button>

          <button
            onClick={() => buyMutation.mutate(1)}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Buy 1 Extra Game (Base)
          </button>

          {!canPlay && (
            <div className="text-sm px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
              No games left. Next free in {formatCountdown(countdown)}.
            </div>
          )}
        </div>

        {/* Status */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 text-sm text-emerald-400"
            >
              {status}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board */}
        <div className="mt-6">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`, gap: "8px" }}
          >
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const isRev = revealed[i];
              const isGem = board?.gemIndex === i;
              const isBomb = board?.bombIndexes.includes(i);

              const bg = isRev
                ? isGem
                  ? "bg-yellow-500/30 border-yellow-500 text-yellow-300"
                  : isBomb
                  ? "bg-rose-600/20 border-rose-500 text-rose-300"
                  : "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-emerald-900/40 border-emerald-700 hover:bg-emerald-800/50";

              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => clickCell(i)}
                  disabled={!board || gameOver || isRev || !canPlay}
                  className={`aspect-square rounded-2xl border transition-colors shadow-sm ${bg} ${
                    !board || gameOver || isRev || !canPlay ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {isRev && isGem && (
                      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                        <Diamond className="w-6 h-6" />
                      </motion.div>
                    )}
                    {isRev && isBomb && (
                      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                        <Bomb className="w-5 h-5" />
                      </motion.div>
                    )}
                    {isRev && !isGem && !isBomb && (
                      <span className="text-[11px] opacity-70">dug</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <section className="mt-8">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Crown className="w-5 h-5" /> Leaderboard
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {loadingLb && <div className="text-sm text-slate-400">Loading...</div>}
            {!loadingLb && (lb?.length ?? 0) === 0 && (
              <div className="text-sm text-slate-400">No scores yet.</div>
            )}
            {lb?.map((row, idx) => (
              <div key={`${row.fid}-${idx}`} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {row.pfp_url ? (
                    <img src={row.pfp_url} alt={row.username ?? "user"} className="w-6 h-6 rounded-full border border-slate-700" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-700" />
                  )}
                  <div className="font-medium">@{row.username ?? row.fid}</div>
                </div>
                <div className="text-slate-300">{row.best_score} pts</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Dig responsibly • © {new Date().getFullYear()} DigBase
      </footer>
    </div>
  );
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode; }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow">
      <div className="flex items-center gap-2 text-slate-300 text-xs">{icon}<span>{title}</span></div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
