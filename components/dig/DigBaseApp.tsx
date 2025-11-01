"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const GRID_SIZE = 7;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const MAX_CLICKS = 30;
const START_REWARD = 250;

function generateBoard() {
  const gemIndex = Math.floor(Math.random() * TOTAL_CELLS);
  const bombs = new Set<number>();

  while (bombs.size < 3) {
    const index = Math.floor(Math.random() * TOTAL_CELLS);
    if (index !== gemIndex) bombs.add(index);
  }

  const cells = Array(TOTAL_CELLS).fill({ type: "empty" });
  cells[gemIndex] = { type: "gem" };
  Array.from(bombs).forEach((b) => (cells[b] = { type: "bomb" }));

  return { cells, gemIndex, bombIndexes: Array.from(bombs) };
}

function timeUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

export default function DigBaseApp() {
  const [board, setBoard] = useState<any | null>(null);
  const [clicked, setClicked] = useState<number[]>([]);
  const [remainingClicks, setRemainingClicks] = useState(MAX_CLICKS);
  const [reward, setReward] = useState(START_REWARD);
  const [gameOver, setGameOver] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [countdown, setCountdown] = useState(timeUntilMidnight());
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Fake login (később Farcaster SDK-val csere)
    // Ha Supabase-ben van user, betöltjük
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUsername(data.user.email || "Player");
        checkGameStatus();
      }
    }
    loadUser();
  }, []);

  async function checkGameStatus() {
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if
