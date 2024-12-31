"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { useUserManagementContext } from "../../contexts/user-management-provider";
import { GRACE_PERIOD } from "../../contracts/user-management";
import { useToast } from "../../components/ui/use-toast";
import { formatEther } from "viem";
import { VotingManagement } from "./voting-management";

export function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { addUser, currentUser, offers, validateDelivery, validateOfferCreation, hasEnedisRole } = useEnergyExchange();
  const { initiateUserRemoval, cancelUserRemoval, finalizeUserRemoval, isRemovingUser } = useUserManagementContext();
  const [newUserAddress, setNewUserAddress] = useState("");
  const [removalAddress, setRemovalAddress] = useState("");
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

  // Check for both admin and ENEDIS roles
  const [hasEnedis, setHasEnedis] = useState(false);

  useEffect(() => {
    async function checkEnedisRole() {
      if (address) {
        const hasEnedisAccess = await hasEnedisRole(address);
        setHasEnedis(hasEnedisAccess);
      }
    }
    checkEnedisRole();
  }, [address, hasEnedisRole]);

  // Early return if not admin
  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-400">You need admin privileges to access this page.</p>
      </div>
    );
  }

  const validateAddress = (address: string): string => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error("Invalid Ethereum address format");
    }
    return address.toLowerCase();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserAddress) return;

    try {
      const checksummedAddress = validateAddress(newUserAddress);
      await addUser(checksummedAddress, isProducer);
      
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

  const handleInitiateRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removalAddress) return;

    try {
      const checksummedAddress = validateAddress(removalAddress);
      await initiateUserRemoval(checksummedAddress);
      
      toast({
        title: "Removal Initiated",
        description: `User removal process started for ${checksummedAddress}. The removal will be effective after ${GRACE_PERIOD / 3600} hours.`,
      });
    } catch (error: any) {
      console.error("Failed to initiate user removal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate user removal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removalAddress) return;

    try {
      const checksummedAddress = validateAddress(removalAddress);
      await cancelUserRemoval(checksummedAddress);
      
      toast({
        title: "Removal Cancelled",
        description: `User removal process cancelled for ${checksummedAddress}.`,
      });
      setRemovalAddress("");
    } catch (error: any) {
      console.error("Failed to cancel user removal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel user removal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFinalizeRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removalAddress) return;

    try {
      const checksummedAddress = validateAddress(removalAddress);
      await finalizeUserRemoval(checksummedAddress);
      
      toast({
        title: "Removal Finalized",
        description: `User ${checksummedAddress} has been successfully removed.`,
      });
      setRemovalAddress("");
    } catch (error: any) {
      console.error("Failed to finalize user removal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to finalize user removal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format quantity from Wh to kWh for display
  const formatQuantity = (whQuantity: bigint) => {
    return (Number(whQuantity) / 1000).toFixed(0);
  };

  // Format price from wei/Wh to MATIC/kWh
  const formatPrice = (weiPerWh: bigint) => {
    const weiPerKwh = weiPerWh * BigInt(1000);
    return formatEther(weiPerKwh);
  };

  const handleValidateDelivery = async (offerId: bigint, isValid: boolean) => {
    try {
      await validateDelivery(offerId, isValid);
      toast({
        title: "Success",
        description: `Energy transfer has been ${isValid ? 'validated' : 'rejected'}.`,
      });
    } catch (error: any) {
      console.error("Failed to validate delivery:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to validate delivery. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleValidateOfferCreation = async (offerId: bigint, isValid: boolean) => {
    try {
      await validateOfferCreation(offerId, isValid);
      toast({
        title: "Success",
        description: `Energy offer creation has been ${isValid ? 'validated' : 'rejected'}.`,
      });
    } catch (error: any) {
      console.error("Failed to validate offer creation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to validate offer creation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter pending offer creations that need validation
  const pendingOfferCreations = offers.filter(
    (offer) => offer.isPendingCreation && 
               offer.producer !== '0x0000000000000000000000000000000000000000'
  );

  // Filter offers with buyers that need transfer validation
  const pendingTransfers = offers.filter((offer) => {
    return (
      offer.buyer !== '0x0000000000000000000000000000000000000000' &&
      !offer.isCompleted &&
      !offer.isValidated
    );
  });

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard (ENEDIS)</h1>

        {/* Voting Management Section */}
        <VotingManagement />

        {/* Pending Offer Creations Section - Only visible to ENEDIS role */}
        {hasEnedis && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Pending Offer Creations</h2>
            <div className="space-y-4">
              {pendingOfferCreations.map((offer) => (
                <div
                  key={offer.id.toString()}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white mb-4">
                    <p>Producer: {offer.producer}</p>
                    <p>Energy Type: {offer.energyType}</p>
                    <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                    <p>Price per kWh: {formatPrice(offer.pricePerUnit)} MATIC</p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleValidateOfferCreation(offer.id, true)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Validate Creation
                    </button>
                    <button
                      onClick={() => handleValidateOfferCreation(offer.id, false)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject Creation
                    </button>
                  </div>
                </div>
              ))}
              {pendingOfferCreations.length === 0 && (
                <p className="text-gray-400">No pending offer creations to validate</p>
              )}
            </div>
          </div>
        )}

        {/* Pending Energy Transfers Section - Only visible to ENEDIS role */}
        {hasEnedis && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Pending Energy Transfers</h2>
            <div className="space-y-4">
              {pendingTransfers.map((offer) => (
                <div
                  key={offer.id.toString()}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white mb-4">
                    <p>Producer: {offer.producer}</p>
                    <p>Consumer: {offer.buyer}</p>
                    <p>Energy Type: {offer.energyType}</p>
                    <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                    <p>Price per kWh: {formatPrice(offer.pricePerUnit)} MATIC</p>
                    <p>Total Price: {formatEther(offer.pricePerUnit * offer.quantity)} MATIC</p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleValidateDelivery(offer.id, true)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Validate Transfer
                    </button>
                    <button
                      onClick={() => handleValidateDelivery(offer.id, false)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject Transfer
                    </button>
                  </div>
                </div>
              ))}
              {pendingTransfers.length === 0 && (
                <p className="text-gray-400">No pending transfers to validate</p>
              )}
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">User Management</h2>
          
          {/* Add User Form */}
          <form onSubmit={handleAddUser} className="space-y-4 mb-8">
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

          {/* User Removal Section */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-white">User Removal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  User Address to Remove
                </label>
                <input
                  type="text"
                  value={removalAddress}
                  onChange={(e) => setRemovalAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Please enter a valid Ethereum address (0x followed by 40 hexadecimal characters)"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleInitiateRemoval}
                  disabled={isRemovingUser || !removalAddress}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  Initiate Removal
                </button>
                <button
                  onClick={handleCancelRemoval}
                  disabled={isRemovingUser || !removalAddress}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel Removal
                </button>
                <button
                  onClick={handleFinalizeRemoval}
                  disabled={isRemovingUser || !removalAddress}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Finalize Removal
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Note: After initiating removal, there is a grace period of {GRACE_PERIOD / 3600} hours before the removal can be finalized.
                During this period, the removal can be cancelled if needed.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-white">
            <li>Manage the voting process for MATIC distribution in the top section</li>
            <li>Start and end voting sessions when appropriate</li>
            <li>Review pending offer creations</li>
            <li>Validate or reject new energy offers from producers</li>
            <li>Review pending energy transfers</li>
            <li>Validate transfers after confirming energy delivery on the grid</li>
            <li>Reject transfers if energy delivery cannot be confirmed</li>
            <li>Use the user management section to add new users to the system</li>
            <li>The address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)</li>
            <li>To remove a user:</li>
            <li className="ml-4">1. Initiate removal - starts the {GRACE_PERIOD / 3600} hour grace period</li>
            <li className="ml-4">2. Cancel removal if needed during grace period</li>
            <li className="ml-4">3. Finalize removal after grace period ends</li>
            <li>You must have admin privileges to manage users and validate transfers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
