import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">JOUL Energy Exchange</h1>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
