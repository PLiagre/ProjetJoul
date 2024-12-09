"use client";

import { useAccount, useBalance } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { formatEther } from "viem";

export function ConsumerDashboard() {
  const { address } = useAccount();
  const { offers, purchaseOffer } = useEnergyExchange();

  const { data: maticBalance } = useBalance({
    address: address,
  });

  const { data: joulBalance } = useBalance({
    address: address,
    token: process.env.NEXT_PUBLIC_JOUL_TOKEN_ADDRESS as `0x${string}`,
  });

  const availableOffers = offers.filter(
    (offer) => offer.isActive && !offer.isCompleted && !offer.buyer
  );

  const purchaseHistory = offers.filter(
    (offer) => 
      offer.buyer?.toLowerCase() === address?.toLowerCase() && 
      offer.isCompleted
  );

  const handlePurchase = async (offerId: bigint, totalPrice: bigint) => {
    try {
      await purchaseOffer(offerId, totalPrice);
    } catch (error) {
      console.error("Error purchasing offer:", error);
    }
  };

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

        {/* Available Offers */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Available Energy Offers</h2>
          <div className="space-y-4">
            {availableOffers.map((offer, index) => {
              const totalPrice = offer.pricePerUnit * offer.quantity;
              return (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white mb-4">
                    <p>Producer: {offer.producer}</p>
                    <p>Energy Type: {offer.energyType}</p>
                    <p>Quantity: {offer.quantity.toString()} kWh</p>
                    <p>Price per kWh: {formatEther(offer.pricePerUnit)} MATIC</p>
                    <p className="col-span-2">
                      Total Price: {formatEther(totalPrice)} MATIC
                    </p>
                  </div>
                  <button
                    onClick={() => handlePurchase(BigInt(index), totalPrice)}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Purchase
                  </button>
                </div>
              );
            })}
            {availableOffers.length === 0 && (
              <p className="text-gray-400">No offers available</p>
            )}
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Purchase History</h2>
          <div className="space-y-4">
            {purchaseHistory.map((offer, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded-lg p-4"
              >
                <div className="grid grid-cols-2 gap-2 text-white">
                  <p>Producer: {offer.producer}</p>
                  <p>Energy Type: {offer.energyType}</p>
                  <p>Quantity: {offer.quantity.toString()} kWh</p>
                  <p>Price per kWh: {formatEther(offer.pricePerUnit)} MATIC</p>
                  <p>Status: {offer.isValidated ? "Validated" : "Pending"}</p>
                  <p>
                    Total Paid: {formatEther(offer.pricePerUnit * offer.quantity)} MATIC
                  </p>
                </div>
              </div>
            ))}
            {purchaseHistory.length === 0 && (
              <p className="text-gray-400">No purchase history</p>
            )}
          </div>
        </div>

        {/* Pending Deliveries */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Pending Deliveries</h2>
          <div className="space-y-4">
            {offers
              .filter(
                (offer) =>
                  offer.buyer?.toLowerCase() === address?.toLowerCase() &&
                  !offer.isCompleted &&
                  !offer.isValidated
              )
              .map((offer, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white">
                    <p>Producer: {offer.producer}</p>
                    <p>Energy Type: {offer.energyType}</p>
                    <p>Quantity: {offer.quantity.toString()} kWh</p>
                    <p>Price per kWh: {formatEther(offer.pricePerUnit)} MATIC</p>
                    <p className="col-span-2 text-yellow-400">
                      Status: Waiting for ENEDIS validation (24h lock period)
                    </p>
                  </div>
                </div>
              ))}
            {offers.filter(
              (offer) =>
                offer.buyer?.toLowerCase() === address?.toLowerCase() &&
                !offer.isCompleted &&
                !offer.isValidated
            ).length === 0 && (
              <p className="text-gray-400">No pending deliveries</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
