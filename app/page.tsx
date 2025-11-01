import DigBaseApp from "@/components/dig/DigBaseApp";
import { FarcasterProvider } from "@/components/farcaster-provider";

export default function Home() {
  return (
    <FarcasterProvider>
      <DigBaseApp />
    </FarcasterProvider>
  );
}
