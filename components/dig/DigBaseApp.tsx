
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useFrame } from '@/components/farcaster-provider'

type Cell = {
  idx: number
  hasGem: boolean
  hasBomb: boolean
  revealed: boolean
}

type Profile = {
  fid: number
  username: string
  avatar_url?: string
  points_total: number
  last_play_at: string | null
}

const BOARD_SIZE = 7
const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE
const CLICKS_MAX = 30

function genBoard() {
  const gemIndex = Math.floor(Math.random() * TOTAL_CELLS)

  const bombsSet = new Set<number>()
  while (bombsSet.size < 3) {
    const b = Math.floor(Math.random() * TOTAL_CELLS)
    if (b !== gemIndex) bombsSet.add(b)
  }
  const bombIndexes = Array.from(bombsSet.values())

  const cells: Cell[] = Array.from({ length: TOTAL_CELLS }, (_, idx) => ({
    idx,
    hasGem: idx === gemIndex,
    hasBomb: bombsSet.has(idx),
    revealed: false,
  }))

  return { cells, gemIndex, bombIndexes }
}

function secondsUntilMidnightUTC() {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}

export default function DigBaseApp() {
  const { context } = useFrame()
  const fid = context?.user?.fid
  const username = context?.user?.username || 'guest'
  const avatar = (context as any)?.user?.pfpUrl || '/images/default-avatar.png'

  const profileQuery = useQuery<Profile>({
    queryKey: ['profile', fid || 'guest'],
    enabled: !!fid,
    queryFn: async () => {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, username, avatar_url: avatar }),
      })
      if (!res.ok) throw new Error('profile error')
      return res.json()
    },
  })

  const canPlayQuery = useQuery<{ canPlay: boolean; seconds: number }>({
    queryKey: ['can-play', fid || 'guest'],
    enabled: !!fid,
    queryFn: async () => {
      const res = await fetch(`/api/can-play?fid=${fid}`)
      if (!res.ok) throw new Error('can-play error')
      return res.json()
    },
  })

  const [board, setBoard] = useState<Cell[]>([])
  const [reward, setReward] = useState<number>(250)
  const [clicksLeft, setClicksLeft] = useState<number>(CLICKS_MAX)
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'WIN' | 'LOSE'>('IDLE')

  const allowClick = (canPlayQuery.data?.canPlay ?? true) && status === 'PLAYING'

  useEffect(() => {
    const { cells } = genBoard()
    setBoard(cells)
    setReward(250)
    setClicksLeft(CLICKS_MAX)
    setStatus('PLAYING')
  }, [fid])

  const finishMutation = useMutation({
    mutationFn: async (finalReward: number) => {
      const res = await fetch('/api/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, username, avatar_url: avatar, reward: finalReward }),
      })
      if (!res.ok) throw new Error('finish error')
      return res.json() as Promise<{ points_total: number }>
    },
  })

  const onCellClick = (c: Cell) => {
    if (!allowClick) return
    if (c.revealed) return

    const newBoard = board.slice()
    newBoard[c.idx] = { ...c, revealed: true }
    setBoard(newBoard)

    let nextReward = reward - 1
    if (c.hasBomb) {
      nextReward = Math.round(nextReward - nextReward * 0.1)
    }

    if (c.hasGem) {
      nextReward = Math.max(0, nextReward) + 100
      setReward(nextReward)
      setStatus('WIN')
      finishMutation.mutate(nextReward)
      return
    }

    const nextClicks = clicksLeft - 1
    setClicksLeft(nextClicks)
    setReward(Math.max(0, nextReward))

    if (nextClicks <= 0) {
      const finalR = Math.max(1, nextReward)
      setReward(finalR)
      setStatus('LOSE')
      finishMutation.mutate(finalR)
    }
  }

  const seconds = canPlayQuery.data?.seconds ?? secondsUntilMidnightUTC()
  const mmss = useMemo(() => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [seconds])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      <header className="w-full max-w-3xl flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💎 DIGBASE</span>
        </div>
        <div className="flex items-center gap-3">
          {avatar ? <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" /> : null}
          <span className="opacity-80">@{username}</span>
          <span className="px-2 py-1 rounded bg-zinc-800">{profileQuery.data?.points_total ?? 0} pts</span>
        </div>
      </header>

      <div className="mt-4 text-sm opacity-80">
        {status === 'PLAYING' ? 'Ready' : `Next game in ${mmss}`}
      </div>

      <div className="mt-3">Reward: {reward} • Remaining: {clicksLeft} • Status: {status}</div>

      <div className="mt-6 grid"
           style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 44px)`, gridTemplateRows: `repeat(${BOARD_SIZE}, 44px)`, gap: '6px' }}>
        {board.map((c) => {
          const bg = c.revealed
            ? c.hasBomb ? '#dc2626' : (c.hasGem ? '#22c55e' : '#16a34a')
            : '#4b5563'

          const content = c.revealed ? (c.hasBomb ? '💣' : (c.hasGem ? '💎' : '')) : ''

          return (
            <button
              key={c.idx}
              disabled={!allowClick || c.revealed}
              onClick={() => onCellClick(c)}
              style={{ width: 44, height: 44, background: bg, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ fontSize: 20 }}>{content}</span>
            </button>
          )
        })}
      </div>

      {(status === 'WIN' || status === 'LOSE') && (
        <div className="mt-6 text-sm opacity-80">
          Saved. Come back tomorrow!
        </div>
      )}
    </div>
  )
}
