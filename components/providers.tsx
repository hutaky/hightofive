'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { FrameProvider } from '@/components/farcaster-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={qc}>
      <FrameProvider>{children}</FrameProvider>
    </QueryClientProvider>
  )
}
