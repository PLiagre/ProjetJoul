"use client";

import { ConsumerDashboard } from "../components/consumer/consumer-dashboard";

export default function ConsumerPage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Consumer Dashboard</h1>
        <ConsumerDashboard />
      </div>
    </main>
  );
}
