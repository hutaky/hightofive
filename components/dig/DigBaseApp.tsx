"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@/components/farcaster-provider";
import { motion } from "framer-motion";
import { Diamond } from "lucide-react";

export default function DigBaseApp() {
  const { context, isSDKLoaded } = useFrame();

  const [score, setScore] = useState<number>(0);
  const [entries, setEntries] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isSDKLoaded) {
      console.warn("Waiting for Farcaster session...");
    }
    if (isSDKLoaded && !context?.user?.fid) {
      console.error("Farcaster loaded, but user has no FID!");
    }
  }, [isSDKLoaded, context]);

  const handleDig = async () => {
    if (!isSDKLoaded || !context?.user?.fid) {
      alert("⚠ You must open this in Farcaster MiniApp mode!");
      return;
    }

    setIsSaving(true);

    try {
      const earned = Math.floor(Math.random() * 20) + 1;

      setScore((prev) => prev + earned);
      setEntries((prev) => [...prev, earned]);

      await fetch("/api/save-score", {
        method: "POST",
        body: JSON.stringify({
          fid: context.user.fid,
          points: earned,
        }),
      });
    } catch (err) {
      console.error("Supabase save failed:", err);
    }

    setIsSaving(false);
  };

  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading Farcaster session...
      </div>
    );
  }

  if (!context?.user?.fid) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 p-8 text-center">
        ⚠ Error: no Farcaster login detected.<br />
        Open this only as a miniapp inside Farcaster.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="flex justify-between p-4 border-b border-gray-700">
        <div className="flex gap-2 items-center text-xl">
          <Diamond className="text-blue-400" />
          DIG BASE
        </div>

        <div className="flex gap-2 items-center">
          <span>{score} pts</span>
        </div>
      </header>

      <div className="flex flex-col items-center py-6">
        <button
          onClick={handleDig}
          disabled={isSaving}
          className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl font-bold text-white"
        >
          {isSaving ? "Saving..." : "DIG!"}
        </button>

        <div className="relative mt-8 h-[400px] w-[200px] bg-slate-900/30 rounded-xl overflow-hidden flex flex-col items-center pt-10">
          {entries.map((v, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 text-lg"
            >
              <Diamond size={18} className="text-cyan-400" />
              +{v}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
