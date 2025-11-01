"use client";

import FarcasterProvider from "@/components/farcaster-provider";
import DigBaseApp from "@/components/dig/DigBaseApp";

export default function Home() {
  return (
    <FarcasterProvider>
      <DigBaseApp />
    </FarcasterProvider>
  );
}

