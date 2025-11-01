'use client'

import FarcasterProvider from '@/components/farcaster-provider'
import { WalletProvider } from '@/components/wallet-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <FarcasterProvider>
        {children}
      </FarcasterProvider>
    </WalletProvider>
  )
}
