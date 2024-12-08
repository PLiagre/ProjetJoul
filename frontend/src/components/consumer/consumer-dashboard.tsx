"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { useJoulToken } from "../../hooks/useJoulToken";
import { useEnergyNFT } from "../../hooks/useEnergyNFT";

export function ConsumerDashboard() {
  const { address, isConnected } = useAccount();
  const { currentUser, offers, purchaseEnergy, validateDelivery, registerUser } = useEnergyExchange();
  const { balance: joulBalance } = useJoulToken();
  const { balance: nftBalance } = useEnergyNFT();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleRegister = async () => {
    if (!isConnected) return;
    setIsRegistering(true);
    try {
      await registerUser(false);
    } catch (error) {
      console.error("Failed to register:", error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePurchase = async (offerId: bigint, totalPrice: bigint) => {
    if (!isConnected) return;
    setIsPurchasing(true);
    try {
      await purchaseEnergy(offerId, totalPrice);
    } catch (error) {
      console.error("Failed to purchase:", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleValidate = async (offerId: bigint) => {
    if (!isConnected) return;
    setIsValidating(true);
    try {
      await validateDelivery(offerId);
    } catch (error) {
      console.error("Failed to validate:", error);
    } finally {
      setIsValidating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
      </div>
    );
  }

  if (!currentUser?.isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Register as Consumer</h1>
        <button
          onClick={handleRegister}
          disabled={isRegistering}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRegistering ? "Registering..." : "Register"}
        </button>
      </div>
    );
  }

  const activeOffers = offers.filter(
    (offer) => offer.isActive && !offer.isValidated && offer.consumer === "0x0000000000000000000000000000000000000000"
  );

  const myPurchases = offers.filter(
    (offer) => offer.consumer.toLowerCase() === address?.toLowerCase()
  );

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-2">JOUL Balance</h2>
          <p className="text-2xl">{joulBalance ? formatEther(joulBalance) : "0"} JOUL</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Energy NFTs</h2>
          <p className="text-2xl">{nftBalance?.toString() || "0"}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Available Energy Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOffers.map((offer, index) => (
            <div key={index} className="p-4 bg-gray-800 rounded-lg">
              <p className="mb-2">Producer: {offer.producer}</p>
              <p className="mb-2">Amount: {offer.energyAmount.toString()} kWh</p>
              <p className="mb-2">Price: {formatEther(offer.pricePerUnit)} ETH/kWh</p>
              <p className="mb-2">Total: {formatEther(offer.totalPrice)} ETH</p>
              <button
                onClick={() => handlePurchase(BigInt(index + 1), offer.totalPrice)}
                disabled={isPurchasing}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isPurchasing ? "Purchasing..." : "Purchase"}
              </button>
            </div>
          ))}
          {activeOffers.length === 0 && (
            <p className="col-span-full text-center">No active offers available</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">My Purchases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myPurchases.map((offer, index) => (
            <div key={index} className="p-4 bg-gray-800 rounded-lg">
              <p className="mb-2">Producer: {offer.producer}</p>
              <p className="mb-2">Amount: {offer.energyAmount.toString()} kWh</p>
              <p className="mb-2">Price: {formatEther(offer.pricePerUnit)} ETH/kWh</p>
              <p className="mb-2">Total: {formatEther(offer.totalPrice)} ETH</p>
              <p className="mb-2">Status: {offer.isValidated ? "Validated" : "Pending"}</p>
              {!offer.isValidated && (
                <button
                  onClick={() => handleValidate(BigInt(index + 1))}
                  disabled={isValidating}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isValidating ? "Validating..." : "Validate Delivery"}
                </button>
              )}
            </div>
          ))}
          {myPurchases.length === 0 && (
            <p className="col-span-full text-center">No purchases yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
