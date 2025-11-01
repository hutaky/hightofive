import React, { useMemo, useState, useEffect } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import { Crown, Diamond, Bomb, Pickaxe, Trophy, Users, Coins, Package, ShieldCheck, Share2, Copy } from "lucide-react";

/**
 * DigBase – v1 UI Scaffold (restored + upgrades)
 * ------------------------------------------------------------
 * ✅ Daily check-in → +1 Game
 * ✅ Start Game → 49 clicks → end modal
 * ✅ Game Packs (extra games)
 * ✅ Clicks Left StatCard
 * ✅ End modal: digs used, points earned, share + copy link incl. referral
 * ✅ Invite friends section with referral link copy
 * ✅ Animated counters for DIG Points & Streak
 */

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
  { key: "purple", label: "Purple
