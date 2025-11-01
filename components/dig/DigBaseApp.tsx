"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@/components/farcaster-provider";
import { supabase } from "@/lib/supabase";

const GRID_SIZE = 7;
const MAX_CLICKS = 30;
const BASE_REWARD = 250;
const BONUS_ON_WIN = 100;
const MIN_REWARD_ON_FAIL = 1;

export default function DigBaseApp() {
  const { context } = useFrame();
  const fid = context?.user?.fid ?? null;
  const username = context?.user?.username ?? "Guest";
  const avatar = context?.user?.pfpUrl ?? null;

  const [cells, setCells] = useState<(null | "empty" | "bomb" | "gem")[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [reward, setReward] = useState(BASE_REWARD);
  const [clicksLeft, setClicksLeft] = useState(MAX_CLICKS);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<"WIN" | "LOSE" | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [retryInSeconds, setRetryInSeconds] = useState(0);

  // ✅ Generate board once
  useEffect(() => {
    const arr = Array(GRID_SIZE * GRID_SIZE).fill("empty");
    const gemIndex = Math.floor(Math.random() * arr.length);
    arr[gemIndex] = "gem";

    let placed = 0;
    while (placed < 3) {
      const i = Math.floor(Math.random() * arr.length);
      if (arr[i] === "empty") {
        arr[i] = "bomb";
        placed++;
      }
    }

    setCells(arr);
    setRevealed(Array(arr.length).fill(false));
  }, []);

  // ✅ Load player score + check daily limit
  useEffect(() => {
    if (!fid) return;

    const checkUser = async () => {
      const { data } = await supabase
        .from("scores")
        .select("*")
        .eq("fid", fid)
        .maybeSingle();

      if (data?.last_play_date) {
        const lastDate = new Date(data.last_play_date);
        const today = new Date();
        const diff = today.getDate() - lastDate.getDate();

        if (diff === 0) {
          setCanPlay(false);
          const midnight = new Date();
          midnight.setHours(24, 0, 0, 0);
          setRetryInSeconds(Math.floor((midnight.getTime() - Date.now()) / 1000));
        } else {
          setCanPlay(true);
        }
      } else {
        setCanPlay(true);
      }

      if (data?.total_score) {
        setUserPoints(data.total_score);
      }
    };

    checkUser();
  }, [fid]);

  // ✅ countdown timer
  useEffect(() => {
    if (retryInSeconds <= 0) return;
    const interval = setInterval(() => {
      setRetryInSeconds((v) => v - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [retryInSeconds]);

  async function saveScore(finalScore: number) {
    if (!fid) return;

    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("fid", fid)
      .maybeSingle();

    if (!data) {
      await supabase.from("scores").insert({
        fid,
        username,
        total_score: finalScore,
        last_play_date: new Date(),
      });
    } else {
      await supabase
        .from("scores")
        .update({
          total_score: data.total_score + finalScore,
          last_play_date: new Date(),
        })
        .eq("fid", fid);
    }

    setUserPoints((v) => v + finalScore);
    setCanPlay(false);
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    setRetryInSeconds(Math.floor((midnight.getTime() - Date.now()) / 1000));
  }

  function clickCell(i: number) {
    if (!canPlay || gameOver || revealed[i]) return;

    const newRevealed = [...revealed];
    newRevealed[i] = true;
    setRevealed(newRevealed);

    let newReward = reward - 1;
    setReward(newReward);
    setClicksLeft((v) => v - 1);

    if (cells[i] === "gem") {
      const winScore = newReward + BONUS_ON_WIN;
      setGameOver(true);
      setResult("WIN");
      saveScore(winScore);
    } else if (cells[i] === "bomb") {
      const lost = newReward <= 0;
      if (lost) {
        setGameOver(true);
        setResult("LOSE");
        saveScore(MIN_REWARD_ON_FAIL);
      }
    } else {
      if (clicksLeft - 1 <= 0) {
        setGameOver(true);
        setResult("LOSE");
        saveScore(MIN_REWARD_ON_FAIL);
      }
    }
  }

  return (
    <div style={{ textAlign: "center", background: "#000", color: "white", padding: 12 }}>
      {avatar && <img src={avatar} width={60} height={60} style={{ borderRadius: "50%" }} />}
      <h2>{username}</h2>
      <p>Total Points: {userPoints}</p>

      {!canPlay ? (
        <p>
          You already played today. New game in: {retryInSeconds}s
        </p>
      ) : (
        <>
          <p>Reward: {reward}</p>
          <p>Remaining clicks: {clicksLeft}</p>
        </>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 40px)`,
          gap: 3,
          margin: "20px auto",
          width: GRID_SIZE * 42,
        }}
      >
        {cells.map((cell, i) => {
          const r = revealed[i];
          let bg = "#444";
          if (r && cell === "empty") bg = "green";
          if (r && cell === "bomb") bg = "red";
          if (r && cell === "gem") bg = "gold";

          return (
            <div
              key={i}
              onClick={() => clickCell(i)}
              style={{
                width: 40,
                height: 40,
                background: bg,
                cursor: canPlay && !gameOver ? "pointer" : "default",
                border: "1px solid #111",
              }}
            >
              {r && cell === "bomb" && "💣"}
              {r && cell === "gem" && "💎"}
            </div>
          );
        })}
      </div>

      {gameOver && <h2>{result === "WIN" ? "WIN!" : "LOSE"}</h2>}
    </div>
  );
}
