"use client";

import type { Context } from '@farcaster/frame-sdk'
import sdk from '@farcaster/frame-sdk'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext } from 'react'


export default function Home() {
  return (
    <FarcasterProvider>
      <DigBaseApp />
    </FarcasterProvider>
  );
}
