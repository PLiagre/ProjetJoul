"use client";

import { useAccount, useBalance } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { formatEther } from "viem";

export function ConsumerDashboard() {
  const { address } = useAccount();
  const { offers, currentUser, purchaseOffer } = useEnergyExchange();

  const { data: maticBalance } = useBalance({
    address: address,
  });

  const { data: joulBalance } = useBalance({
    address: address,
    token: process.env.NEXT_PUBLIC_JOUL_TOKEN_ADDRESS as `0x${string}`,
  });

  // Add access control checks
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
      </div>
    );
  }

  if (currentUser?.isProducer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
        <p className="text-gray-400">Producers cannot access the consumer dashboard.</p>
      </div>
    );
  }

  // Format quantity from Wh to kWh for display
  const formatQuantity = (whQuantity: bigint) => {
    return (Number(whQuantity) / 1000).toFixed(3);
  };

  // Format price from wei/Wh to MATIC/kWh
  const formatPrice = (weiPerWh: bigint) => {
    const weiPerKwh = weiPerWh * BigInt(1000);
    return formatEther(weiPerKwh);
  };

  const handlePurchase = async (offerId: bigint, totalPrice: bigint) => {
    try {
      await purchaseOffer(offerId, totalPrice);
    } catch (error) {
      console.error("Error purchasing offer:", error);
    }
  };

  // Filter active offers (validated by Enedis and available for purchase)
  const activeOffers = offers.filter(
    (offer) => 
      offer.isActive && 
      !offer.isCompleted && 
      !offer.isPendingCreation && 
      offer.producer.toLowerCase() !== address?.toLowerCase()
  );

  // Filter user's purchases
  const userPurchases = offers.filter(
    (offer) => offer.buyer.toLowerCase() === address?.toLowerCase()
  );

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Consumer Dashboard</h1>

        {/* Balances Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Balances</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 mb-2">MATIC Balance</p>
              <p className="text-white text-xl font-semibold">{maticBalance?.formatted || "0"} MATIC</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 mb-2">JOUL Balance</p>
              <p className="text-white text-xl font-semibold">{joulBalance?.formatted || "0"} JOUL</p>
            </div>
          </div>
        </div>

        {/* Available Offers Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Available Energy Offers</h2>
          <div className="space-y-4">
            {activeOffers.map((offer) => (
              <div
                key={offer.id.toString()}
                className="bg-gray-700 rounded-lg p-4"
              >
                <div className="grid grid-cols-2 gap-2 text-white mb-4">
                  <p>Producer: {offer.producer}</p>
                  <p>Energy Type: {offer.energyType}</p>
                  <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                  <p>Price per kWh: {formatPrice(offer.pricePerUnit)} MATIC</p>
                  <p className="col-span-2">
                    Total Price: {formatEther(offer.pricePerUnit * offer.quantity)} MATIC
                  </p>
                </div>
                <button
                  onClick={() => handlePurchase(offer.id, offer.pricePerUnit * offer.quantity)}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Purchase Energy
                </button>
              </div>
            ))}
            {activeOffers.length === 0 && (
              <p className="text-gray-400">No energy offers available</p>
            )}
          </div>
        </div>

        {/* Purchase History Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Purchase History</h2>
          <div className="space-y-4">
            {userPurchases.map((offer) => (
              <div
                key={offer.id.toString()}
                className="bg-gray-700 rounded-lg p-4"
              >
                <div className="grid grid-cols-2 gap-2 text-white">
                  <p>Producer: {offer.producer}</p>
                  <p>Energy Type: {offer.energyType}</p>
                  <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                  <p>Price per kWh: {formatPrice(offer.pricePerUnit)} MATIC</p>
                  <p>Status: {offer.isValidated ? "Validated" : offer.isCompleted ? "Rejected" : "Pending"}</p>
                  <p>Total Price: {formatEther(offer.pricePerUnit * offer.quantity)} MATIC</p>
                </div>
              </div>
            ))}
            {userPurchases.length === 0 && (
              <p className="text-gray-400">No purchase history</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
