
'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion, animate, useMotionValue } from 'framer-motion'
import { Crown, Diamond, Bomb, Pickaxe, Trophy, Users, Coins, Package, ShieldCheck, Share2, Copy } from 'lucide-react'
import { useFrame } from '@/components/farcaster-provider'
import { useAccount, useSendTransaction, useSwitchChain, useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { base } from 'viem/chains'
import { PACKS_CONTRACT } from '@/lib/contract'

const GRID_SIZE = 7
const GAME_PACKS = [
  { id: 0, label: 'Solo Game', games: 1, priceEth: 0.00025 },
  { id: 1, label: '5-Game Pack', games: 5, priceEth: 0.001 },
  { id: 2, label: 'Digger Pack', games: 25, priceEth: 0.004 },
  { id: 3, label: 'Whale Pack', games: 50, priceEth: 0.0075, badge: '+Best value' },
] as const

const GEM_TYPES = [
  { key: 'blue', label: 'Blue Gem', mult: 1, color: 'text-sky-400' },
  { key: 'purple', label: 'Purple Gem', mult: 2, color: 'text-fuchsia-400' },
  { key: 'gold', label: 'Golden Gem', mult: 3, color: 'text-yellow-400' },
] as const

type GemType = typeof GEM_TYPES[number]['key']

function randomGem(): GemType {
  const r = Math.random()
  if (r < 0.65) return 'blue'
  if (r < 0.92) return 'purple'
  return 'gold'
}

function seedBoard(size: number) {
  const total = size * size
  const gemIndex = Math.floor(Math.random() * total)
  const bombs = new Set<number>()
  while (bombs.size < 3) {
    const b = Math.floor(Math.random() * total)
    if (b !== gemIndex) bombs.add(b)
  }
  return { gemIndex, bombs: Array.from(bombs), gemType: randomGem() as GemType }
}

function computePoints(digs: number, bombsHit: number, gemType: GemType) {
  const basePts = 250
  const mult = GEM_TYPES.find(g => g.key === gemType)?.mult ?? 1
  const baseScore = (basePts * mult) / Math.max(1, digs)
  const penaltyPct = Math.min(0.3, bombsHit * 0.1)
  const finalScore = Math.round(baseScore * (1 - penaltyPct))
  return Math.max(0, finalScore)
}

function AnimatedNumber({ value, duration = 0.6 }: { value: number; duration?: number; }) {
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

async function api(path: string, method: 'GET'|'POST', payload?: any) {
  const url = method === 'GET' && payload ? `${path}?${new URLSearchParams(payload).toString()}` : path
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(payload) : undefined })
  if (!res.ok) throw new Error(await res.text())
  return await res.json()
}

export default function DigBaseApp() {
  const { context } = useFrame()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { isConnected } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()

  const fid = context?.user?.fid as number | undefined
  const username = context?.user?.username
  const pfp = context?.user?.pfpUrl || undefined

  const [profile, setProfile] = useState<any>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [streak, setStreak] = useState(0)
  const [digPoints, setDigPoints] = useState(0)
  const [games, setGames] = useState(0)

  const [showShop, setShowShop] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [showStart, setShowStart] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)

  const [boardSeed, setBoardSeed] = useState(() => seedBoard(GRID_SIZE))
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [bombsHit, setBombsHit] = useState(0)
  const [gemFound, setGemFound] = useState(false)
  const [clicksLeft, setClicksLeft] = useState(0)
  const [lastGamePoints, setLastGamePoints] = useState(0)
  const [lastDigs, setLastDigs] = useState(0)

  useEffect(() => {
    if (!fid) return
    api('/api/get-stats', 'GET', { fid, username, pfp }).then(({ profile }) => {
      setProfile(profile)
      setStreak(profile.streak || 0)
      setGames(profile.games_left || 0)
      setDigPoints(profile.dig_points || 0)
      const today = new Date().toISOString().slice(0,10)
      setCheckedIn(profile.last_checkin === today)
      setShowStart(profile.last_checkin === today)
    }).catch(console.error)
  }, [fid])

  function resetBoard() {
    setBoardSeed(seedBoard(GRID_SIZE))
    setRevealed(new Set())
    setBombsHit(0)
    setGemFound(false)
  }

  async function handleCheckIn() {
    if (!fid) return
    try {
      const { profile, alreadyCheckedIn } = await api('/api/check-in', 'POST', { fid })
      setProfile(profile)
      setStreak(profile.streak || 0)
      setDigPoints(profile.dig_points || 0)
      setGames(profile.games_left || 0)
      setCheckedIn(true)
      setShowStart(true)
    } catch (e) {
      console.error(e)
      alert('Check-in failed')
    }
  }

  function startGame() {
    if (!checkedIn) return;
    if (games <= 0) { setShowShop(true); return; }
    setGames(g => Math.max(0, g - 1));
    resetBoard();
    setClicksLeft(GRID_SIZE * GRID_SIZE);
    setShowStart(false);
  }

  function computeAndFinish(nextRevealedSize: number) {
    const digsUsed = nextRevealedSize
    const points = computePoints(digsUsed, bombsHit, boardSeed.gemType)
    setLastDigs(digsUsed)
    setLastGamePoints(points)
    setDigPoints(p => p + points)
    setGemFound(true)
    setShowEndModal(true)
    setShowStart(true)
    if (fid) {
      api('/api/save-score','POST',{
        fid,
        points,
        digs_used: digsUsed,
        bombs_hit: bombsHit,
        gem_type: boardSeed.gemType,
      }).then((res) => {
        if (res?.profile) {
          setProfile(res.profile)
          setDigPoints(res.profile.dig_points || 0)
        }
      }).catch(console.error)
    }
  }

  function handleCellClick(idx: number) {
    if (!checkedIn || clicksLeft <= 0 || gemFound) return;
    if (revealed.has(idx)) return;

    const next = new Set(revealed);
    next.add(idx);
    setRevealed(next);
    setClicksLeft(c => Math.max(0, c - 1));

    if (idx === boardSeed.gemIndex) {
      computeAndFinish(next.size)
    } else if (boardSeed.bombs.includes(idx)) {
      setBombsHit(b => b + 1);
    }
  }

  async function buyPack(packId: number, priceEth: number, gamesToAdd: number) {
    try {
      if (!isConnected) {
        alert('Wallet is not connected via Warpcast. Open this in Warpcast.')
        return
      }
      if (chainId !== base.id && switchChain) {
        await switchChain({ chainId: base.id })
      }
      if (!PACKS_CONTRACT) {
        alert('Contract address not set')
        return
      }
      if (!fid) {
        alert('No FID')
        return
      }
      const txHash = await sendTransactionAsync({
        to: PACKS_CONTRACT,
        value: parseEther(String(priceEth)),
      })
      // Simplified: trust success and credit immediately (for production, verify receipt server-side)
      setGames(g => g + gamesToAdd)
      alert('Purchase sent. Games credited.')
    } catch (e:any) {
      console.error(e)
      alert(e?.message || 'Purchase failed')
    }
  }

  const clicksTarget = GRID_SIZE * GRID_SIZE
  const referral = `https://digbase.xyz/?ref=${username || 'you'}`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/60 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0.9, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="p-2 rounded-2xl bg-slate-800">
              <Pickaxe className="w-5 h-5" />
            </motion.div>
            <div className="text-lg font-semibold">DigBase</div>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">v1</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLeaderboardOpen(s => !s)} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Leaderboard
            </button>
            <div className="text-xs text-slate-400">FID: {fid ?? '-'}</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <StatCard icon={<Coins className="w-4 h-4" />} title="DIG Points" value={<AnimatedNumber value={digPoints} />} />
          <StatCard icon={<Crown className="w-4 h-4" />} title="Streak" value={<AnimatedNumber value={streak} />} />
          <StatCard icon={<Users className="w-4 h-4" />} title="Games Left" value={games} />
          <StatCard icon={<Diamond className="w-4 h-4" />} title="Today’s Gem" value={<TodayGem />} />
          <StatCard icon={<Pickaxe className="w-4 h-4" />} title="Clicks Left" value={`${clicksLeft}/${clicksTarget}`} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={handleCheckIn} disabled={checkedIn} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow">
            {checkedIn ? "Checked in" : "Daily Check-in (+5 DIG +1 Game)"}
          </button>
          {checkedIn && (
            <button onClick={startGame} disabled={!showStart} className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow">
              Start Game
            </button>
          )}
          <button onClick={() => setShowShop(true)} className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4" /> Buy Game Packs
          </button>
        </div>

        {!checkedIn && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm">
            Daily check-in required before playing.
          </div>
        )}

        <div className="mt-6 grid grid-cols-7 gap-2">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
            const isGemRevealed = idx === boardSeed.gemIndex && gemFound;
            const isBombRevealed = boardSeed.bombs.includes(idx) && revealed.has(idx) && !isGemRevealed;
            const isRevealed = revealed.has(idx) || isGemRevealed;

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={!checkedIn || clicksLeft <= 0 || gemFound}
                className={`aspect-square rounded-2xl border transition-colors shadow-sm
                  ${isGemRevealed ? "bg-emerald-600/20 border-emerald-600" : isBombRevealed ? "bg-rose-600/10 border-rose-600/60" : isRevealed ? "bg-slate-800 border-slate-700" : "bg-slate-900/60 border-slate-800 hover:bg-slate-800"}
                  ${!checkedIn || clicksLeft <= 0 || gemFound ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div className="w-full h-full flex items-center justify-center">
                  {isGemRevealed ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                      <Diamond className="w-5 h-5 text-yellow-400" />
                      <span className="text-xs">Gem!</span>
                    </motion.div>
                  ) : isBombRevealed ? (
                    <div className="flex items-center gap-1 text-rose-400">
                      <Bomb className="w-4 h-4" />
                      <span className="text-[10px]">-10%</span>
                    </div>
                  ) : isRevealed ? (
                    <span className="text-[10px] text-slate-500">dug</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-sm text-slate-300">
            <span className="font-medium">Invite friends</span> — you both earn bonus DIG when they start playing (per rules).
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(referral); alert('Copied ✅') }} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm flex items-center gap-2">
              <Copy className="w-4 h-4" /> Copy referral link
            </button>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Dig responsibly • © {new Date().getFullYear()} DigBase
      </footer>

      {showShop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Game Packs</div>
              <button onClick={() => setShowShop(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="mt-4 space-y-2">
              {GAME_PACKS.map((p) => (
                <button key={p.id} onClick={() => buyPack(p.id, p.priceEth, p.games)} className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{p.label} • {p.games} Game{p.games > 1 ? "s" : ""}</div>
                      {p.badge && <div className="text-[10px] text-emerald-400">{p.badge}</div>}
                    </div>
                  </div>
                  <div className="text-sm text-slate-300">{p.priceEth} ETH</div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              • One Game = full 49-tile dig. Daily check-in grants 1 free Game per day.
            </div>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="text-lg font-semibold mb-1">🎉 You found the gem!</div>
            <div className="text-sm text-slate-300 mb-2">Found in <span className="font-semibold">{lastDigs}</span> digs.</div>
            <div className="text-sm text-slate-300 mb-4">You earned <span className="font-semibold text-emerald-400">{lastGamePoints}</span> DIG.</div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => { const url = encodeURIComponent(referral); const text = encodeURIComponent(`I found the gem in ${lastDigs} digs and earned ${lastGamePoints} $DIG on DigBase! 💎🔨 Join me: ${referral}`); window.open(`https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`, "_blank") }} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Share on Warpcast
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`I found the gem in ${lastDigs} digs and earned ${lastGamePoints} $DIG on DigBase! ${referral}`); alert('Copied ✅') }} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy result
              </button>
              {games > 0 ? (
                <button onClick={() => { setShowEndModal(false); startGame(); }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow">Play Again</button>
              ) : (
                <button onClick={() => { setShowEndModal(false); setShowShop(true); }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow">Buy Game Packs</button>
              )}
              <button onClick={() => setShowEndModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700">Quit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TodayGem() {
  return (
    <div className="flex items-center gap-2">
      <Diamond className="w-4 h-4 text-yellow-400" />
      <span className="text-slate-200">Random rarity</span>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode | number; }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow">
      <div className="flex items-center gap-2 text-slate-300 text-xs">{icon}<span>{title}</span></div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}
