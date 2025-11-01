'use client'
import { useState } from 'react'

export default function DigBaseApp() {
  const [score, setScore] = useState(0)

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold">DigBase</h1>
      <p>Score: {score}</p>
    </div>
  )
}