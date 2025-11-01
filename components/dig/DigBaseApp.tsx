"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Gem, Wallet } from "lucide-react";

type GemHit = {
  xpos: number;
  ypos: number;
  gem: "blue" | "purple" | "red";
  points: number;
};

const GEM_TYPES = [
  { key: "blue", label: "Blue Gem", mult: 1, color: "text-sky-400" },
  { key: "purple", label: "Purple Gem", mult: 2, color: "text-purple-400" },
  { key: "red", label: "Red Gem", mult: 3, color: "text-red-400" },
] as const;

const DigBaseApp = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState(0);
  const [hits, setHits] = useState<GemHit[]>([]);
  const [digging, setDigging] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fake auth (később Farcaster auth lesz)
  useEffect(() => {
    const fake = { id: "demo-user", name: "Demo User", points: 0 };
    setUser(fake);
    setLoading(false);
  }, []);

  const dig = async () => {
    if (digging) return;
    setDigging(true);

    const gem = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    const gained = gem.mult * (10 + Math.floor(Math.random() * 10));

    const newHit: GemHit = {
      xpos: Math.random() * 100,
      ypos: Math.random() * 100,
      gem: gem.key,
      points: gained,
    };

    setHits((prev) => [...prev, newHit]);
    setPoints((prev) => prev + gained);

    // save to supabase (optional demo)
    await supabase.from("dig_hits").insert({
      user_id: user?.id,
      gem: newHit.gem,
      points: newHit.points,
    });

    setDigging(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="animate-spin w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/60 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gem className="text-sky-400 w-6 h-6" />
            <span className="font-bold text-lg">DIG BASE</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <span>{points} pts</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={dig}
          disabled={digging}
          className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 font-semibold"
        >
          {digging ? "Digging..." : "DIG!"}
        </button>

        <div className="relative mt-10 w-full h-[400px] border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
          {hits.map((hit, i) => {
            const gemType = GEM_TYPES.find((g) => g.key === hit.gem)!;
            return (
              <motion.div
                key={i}
                className="absolute flex items-center gap-1 font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{
                  top: `${hit.ypos}%`,
                  left: `${hit.xpos}%`,
                }}
              >
                <Gem className={`${gemType.color} w-5 h-5`} />
                <span className={gemType.color}>+{hit.points}</span>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default DigBaseApp;
