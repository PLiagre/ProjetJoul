"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserManagementContext } from "../../contexts/user-management-provider";

export function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { addUser, isAddingUser } = useUserManagementContext();
  const [newUserAddress, setNewUserAddress] = useState("");
  const [isProducer, setIsProducer] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !newUserAddress) return;

    try {
      await addUser(newUserAddress, isProducer);
      setNewUserAddress("");
      setIsProducer(false);
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Add New User</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                User Address
              </label>
              <input
                type="text"
                value={newUserAddress}
                onChange={(e) => setNewUserAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isProducer"
                checked={isProducer}
                onChange={(e) => setIsProducer(e.target.checked)}
                className="rounded bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="isProducer" className="text-sm font-medium">
                Register as Producer (unchecked = Consumer)
              </label>
            </div>

            <button
              type="submit"
              disabled={isAddingUser || !newUserAddress}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingUser ? "Adding User..." : "Add User"}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Enter the Ethereum address of the user you want to add</li>
            <li>Check the box if you want to register them as a Producer</li>
            <li>Leave the box unchecked to register them as a Consumer</li>
            <li>Click &quot;Add User&quot; to register them in the system</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
