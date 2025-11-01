'use client'

import type { Context } from '@farcaster/frame-sdk'
import sdk from '@farcaster/frame-sdk'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext } from 'react'

interface FrameContextValue {
  context: Context.FrameContext | undefined
  isLoading: boolean
  isSDKLoaded: boolean
  isEthProviderAvailable: boolean
  actions: typeof sdk.actions | undefined
}

const FrameProviderContext = createContext<FrameContextValue | undefined>(undefined)

export function useFrame() {
  const ctx = useContext(FrameProviderContext)
  if (!ctx) throw new Error('useFrame must be used within FrameProvider')
  return ctx
}

export function FrameProvider({ children }: { children: ReactNode }) {
  const q = useQuery({
    queryKey: ['farcaster-context'],
    queryFn: async () => {
      const context = await sdk.context
      try {
        await sdk.actions.ready()
        return { context, ready: true }
      } catch {
        return { context, ready: false }
      }
    },
  })

  return (
    <FrameProviderContext.Provider
      value={{
        context: q.data?.context,
        actions: sdk.actions,
        isLoading: q.isPending,
        isSDKLoaded: Boolean(q.data?.ready && q.data?.context),
        isEthProviderAvailable: Boolean(sdk.wallet.ethProvider),
      }}
    >
      {children}
    </FrameProviderContext.Provider>
  )
}
