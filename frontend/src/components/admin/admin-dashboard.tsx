"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { useToast } from "../../components/ui/use-toast";

export function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { addUser, removeUser, currentUser } = useEnergyExchange();
  const [newUserAddress, setNewUserAddress] = useState("");
  const [isProducer, setIsProducer] = useState(false);
  const { toast } = useToast();

  // Early return if not connected
  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
      </div>
    );
  }

  // Early return if not admin
  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-400">You need admin privileges to access this page.</p>
      </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserAddress) return;

    try {
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(newUserAddress)) {
        throw new Error("Invalid Ethereum address format");
      }

      // Ensure address is checksummed
      const checksummedAddress = newUserAddress.toLowerCase();

      // Log the attempt
      console.log('Attempting to add user:', {
        address: checksummedAddress,
        isProducer,
        callerAddress: address,
        isAdmin: currentUser.isAdmin
      });

      // Add the user with their role
      await addUser(checksummedAddress, isProducer);
      
      // Clear form on success
      setNewUserAddress("");
      setIsProducer(false);
      
      toast({
        title: "Success",
        description: `User ${checksummedAddress} has been ${isProducer ? 'added as producer' : 'added as consumer'}.`,
      });
    } catch (error: any) {
      console.error("Failed to add user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Add User</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                User Address
              </label>
              <input
                type="text"
                value={newUserAddress}
                onChange={(e) => setNewUserAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Please enter a valid Ethereum address (0x followed by 40 hexadecimal characters)"
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
              <label htmlFor="isProducer" className="text-sm font-medium text-white">
                Register as Producer (unchecked = Consumer)
              </label>
            </div>

            <button
              type="submit"
              disabled={!newUserAddress}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add User
            </button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-white">
            <li>Enter the Ethereum address of the user you want to add</li>
            <li>Check the box if you want to register them as a Producer</li>
            <li>The address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)</li>
            <li>You must have admin privileges to manage users</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
