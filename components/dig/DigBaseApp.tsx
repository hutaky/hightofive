"use client";

import { useState, useEffect } from "react";

const GRID_SIZE = 7;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

function generateBoard() {
  const gemIndex = Math.floor(Math.random() * TOTAL_CELLS);

  let bombs: number[] = [];
  while (bombs.length < 3) {
    const r = Math.floor(Math.random() * TOTAL_CELLS);
    if (r !== gemIndex && !bombs.includes(r)) {
      bombs.push(r);
    }
  }

  console.log("✅ Board generated:", { gemIndex, bombs });

  return { gemIndex, bombs };
}

export default function DigBaseApp() {
  const [board, setBoard] = useState<{ gemIndex: number; bombs: number[] }>();
  const [revealed, setRevealed] = useState<number[]>([]);
  const [remainingClicks, setRemainingClicks] = useState(30);
  const [reward, setReward] = useState(250);
  const [status, setStatus] = useState("PLAYING");

  useEffect(() => {
    const b = generateBoard();
    setBoard(b);
  }, []);

  function handleClick(index: number) {
    if (!board || status !== "PLAYING" || revealed.includes(index)) return;

    setRevealed((prev) => [...prev, index]);
    setRemainingClicks((prev) => prev - 1);
    setReward((prev) => prev - 1);

    if (index === board.gemIndex) {
      setStatus("WIN");
      setReward((r) => r + 100);
    } else if (board.bombs.includes(index)) {
      setReward((prev) => Math.max(1, Math.round(prev * 0.9)));
    }

    if (remainingClicks - 1 === 0 && index !== board.gemIndex) {
      setStatus("LOSE");
      setReward(1);
    }
  }

  if (!board) return <div style={{ color: "white" }}>Loading...</div>;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
        flexDirection: "column",
        color: "white",
      }}
    >
      <h2>DIGBASE</h2>
      <p>Reward: {reward}</p>
      <p>Remaining: {remainingClicks}</p>
      <p>Status: {status}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 40px)`,
          gap: "5px",
          marginTop: "20px",
        }}
      >
        {Array.from({ length: TOTAL_CELLS }).map((_, index) => {
          const isRevealed = revealed.includes(index);
          const isGem = index === board.gemIndex && isRevealed;
          const isBomb = board.bombs.includes(index) && isRevealed;

          return (
            <div
              key={index}
              onClick={() => handleClick(index)}
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: isRevealed
                  ? isGem
                    ? "gold"
                    : isBomb
                    ? "red"
                    : "gray"
                  : "green",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              {isGem && "💎"}
              {isBomb && "💣"}
            </div>
          );
        })}
      </div>

      {status !== "PLAYING" && (
        <button
          style={{ marginTop: "20px", padding: "10px" }}
          onClick={() => {
            const b = generateBoard();
            setBoard(b);
            setRevealed([]);
            setRemainingClicks(30);
            setReward(250);
            setStatus("PLAYING");
          }}
        >
          Play Again
        </button>
      )}
    </div>
  );
}
