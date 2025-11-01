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

    if (data) {
      setHasPlayedToday(true);
    }
  }

  useEffect(() => {
    setBoard(generateBoard());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(timeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function saveScore(finalReward: number) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("scores").insert([{ score: finalReward, date: today }]);
  }

  function handleClick(index: number) {
    if (!board || clicked.includes(index) || gameOver || hasPlayedToday) return;

    const newClicked = [...clicked, index];
    setClicked(newClicked);
    setRemainingClicks((prev) => prev - 1);

    const cell = board.cells[index];

    if (cell.type === "bomb") {
      const reduced = Math.max(1, Math.round(reward * 0.9));
      setReward(reduced);
    } else if (cell.type === "gem") {
      const finalReward = reward + 100;
      setReward(finalReward);
      setGameOver(true);
      saveScore(finalReward);
      return;
    } else {
      setReward((prev) => Math.max(1, prev - 1));
    }

    if (remainingClicks - 1 <= 0) {
      setGameOver(true);
      const finalReward = Math.max(1, reward);
      saveScore(finalReward);
    }
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  if (!board) return <div className="text-white">Loading game…</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">

      <h1 className="text-3xl font-bold mb-2">DIGBASE</h1>
      {username && <p>Logged in as: {username}</p>}

      {hasPlayedToday ? (
        <div className="mt-4 text-center">
          <p className="text-xl font-semibold">Már játszottál ma! ✅</p>
          <p className="text-sm text-gray-400">
            Következő játék: {formatTime(countdown)}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mt-4">
            {board.cells.map((cell: any, idx: number) => {
              const wasClicked = clicked.includes(idx);
              let bg = "bg-green-800";

              if (wasClicked && cell.type === "bomb") bg = "bg-red-600";
              if (wasClicked && cell.type === "gem") bg = "bg-yellow-400";
              if (wasClicked && cell.type === "empty") bg = "bg-black";

              return (
                <div
                  key={idx}
                  onClick={() => handleClick(idx)}
                  className={`${bg} w-10 h-10 cursor-pointer flex items-center justify-center border border-gray-700`}
                >
                  {wasClicked && cell.type === "gem" && (
                    <Image src="/images/gem.png" alt="gem" width={20} height={20} />
                  )}
                  {wasClicked && cell.type === "bomb" && (
                    <Image src="/images/bomb.png" alt="bomb" width={20} height={20} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <p>Kattintások: {remainingClicks}/{MAX_CLICKS}</p>
            <p>Jutalom: {reward}</p>
            {gameOver && <p className="text-yellow-200">Játék vége ✅</p>}
          </div>
        </>
      )}
    </div>
  );
}
