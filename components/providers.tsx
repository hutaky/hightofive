"use client";

import { ReactNode } from "react";
import { FrameProvider } from "@/components/farcaster-provider";
import { WalletProvider } from "@/components/wallet-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FrameProvider>
        <WalletProvider>{children}</WalletProvider>
      </FrameProvider>
    </QueryClientProvider>
  );
}
