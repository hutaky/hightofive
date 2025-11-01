'use client'
import { FrameProvider } from '@/components/farcaster-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <FrameProvider>{children}</FrameProvider>
}