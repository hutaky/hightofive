"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import {
  Crown,
  Diamond,
  Bomb,
  Pickaxe,
  Trophy,
  Users,
  Coins,
  Package,
  ShieldCheck,
  Share2,
  Copy,
} from "lucide-react";

const GRID_SIZE = 7;

type GamePack = {
  id: number;
  label: string;
  games: number;
  priceEth: number;
  badge?: string;
};

const GAME_PACKS: GamePack[] = [
  { id: 0, label: "Solo Game", games: 1, priceEth: 0.00025 },
  { id: 1, label: "5-Game Pack", games: 5, priceEth: 0.001 },
  { id: 2, label: "Digger Pack", games: 25, priceEth: 0.004 },
  { id: 3, label: "Whale Pack", games: 50, priceEth: 0.0075, badge: "+Best value" },
];

const GEM_TYPES = [
  { key: "blue", label: "Blue Gem", mult: 1, color: "text-sky-400" },
  { key: "purple", label: "Purple Gem", mult: 2, color: "text-fuchsia-400" },
  { key: "gold", label: "Golden Gem", mult: 3, color: "text-yellow-400" },
] as const;

type GemType = typeof GEM_TYPES[number]["key"];

function randomGem(): GemType {
  const r = Math.random();
  if (r < 0.65) return "blue";
  if (r < 0.92) return "purple";
  return "gold";
}

function seedBoard(size: number) {
  const total = size * size;
  const gemIndex = Math.floor(Math.random() * total);
  const bombs = new Set<number>();
  while (bombs.size < 3) {
    const b = Math.floor(Math.random() * total);
    if (b !== gemIndex) bombs.add(b);
  }
  return { gemIndex, bombs: Array.from(bombs), gemType: randomGem() as GemType };
}

function computePoints(digs: number, bombsHit: number, gemType: GemType) {
  const base = 250;
  const meta = GEM_TYPES.find((g) => g.key === gemType);
  const mult = meta ? meta.mult : 1;
  const baseScore = (base * mult) / Math.max(1, digs);
  const penaltyPct = Math.min(0.3, bombsHit * 0.1);
  const finalScore = Math.round(baseScore * (1 - penaltyPct));
  return Math.max(0, finalScore);
}

function AnimatedNumber({ value, duration = 0.6 }: { value: number; duration?: number }) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span>{display}</span>;
}

export default function DigBaseApp() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [digPoints, setDigPoints] = useState(0);

  const [games, setGames] = useState(0);

  const [showShop, setShowShop] = useState(false);
  const [showNFT, setShowNFT] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const [boardSeed, setBoardSeed] = useState(() => seedBoard(GRID_SIZE));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [bombsHit, setBombsHit] = useState(0);
  const [gemFound, setGemFound] = useState(false);
  const [clicksLeft, setClicksLeft] = useState(0);
  const [lastGamePoints, setLastGamePoints] = useState(0);
  const [lastDigs, setLastDigs] = useState(0);

  const referral = "https://digbase.xyz/?ref=user";

  function resetBoard() {
    setBoardSeed(seedBoard(GRID_SIZE));
    setRevealed(new Set());
    setBombsHit(0);
    setGemFound(false);
  }

  function handleCheckIn() {
    if (!checkedIn) {
      setCheckedIn(true);
      setStreak((s) => s + 1);
      setDigPoints((p) => p + 5);
      setGames((g) => g + 1);
      setShowStart(true);
      setClicksLeft(0);
    }
  }

  function startGame() {
    if (!checkedIn) return;
    if (games <= 0) {
      setShowShop(true);
      return;
    }
    setGames((g) => Math.max(0, g - 1));
    resetBoard();
    setClicksLeft(GRID_SIZE * GRID_SIZE);
    setShowStart(false);
  }

  function handleCellClick(idx: number) {
    if (!checkedIn || clicksLeft <= 0 || gemFound) return;
    if (revealed.has(idx)) return;

    const next = new Set(revealed);
    next.add(idx);
    setRevealed(next);
    setClicksLeft((c) => Math.max(0, c - 1));

    if (idx === boardSeed.gemIndex) {
      const digsUsed = next.size;
      const points = computePoints(digsUsed, bombsHit, boardSeed.gemType);
      setLastDigs(digsUsed);
      setLastGamePoints(points);
      setDigPoints((p) => p + points);
      setGemFound(true);
      setShowEndModal(true);
      setShowStart(true);
    } else if (boardSeed.bombs.includes(idx)) {
      setBombsHit((b) => b + 1);
    }
  }

  function buyPack(gamesToAdd: number) {
    setGames((g) => g + gamesToAdd);
    setShowShop(false);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard ✅");
  }

  function shareOnWarpcast() {
    const url = encodeURIComponent(referral);
    const text = encodeURIComponent(
      `I found the gem in ${lastDigs} digs and earned ${lastGamePoints} $DIG on DigBase! 💎🔨 Join me: ${referral}`
    );
    window.open(`https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/60 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.9, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-2 rounded-2xl bg-slate-800"
            >
              <Pickaxe className="w-5 h-5" />
            </motion.div>
            <div className="text-lg font-semibold">DigBase</div>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
              v1
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-4 py-6
