"use client";

import { useAccount } from "wagmi";
import { AdminDashboard } from "../components/admin/admin-dashboard";

export default function Home() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome to Joul Energy Exchange</h1>
        <p className="text-gray-400 mb-8">Please connect your wallet to continue</p>
      </div>
    );
  }

  return <AdminDashboard />;
}
