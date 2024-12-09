"use client";

import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { formatEther } from "viem";

export function ProducerDashboard() {
  const { address } = useAccount();
  const { createOffer, offers } = useEnergyExchange();
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [energyType, setEnergyType] = useState("solar");

  const { data: maticBalance } = useBalance({
    address: address,
  });

  const { data: joulBalance } = useBalance({
    address: address,
    token: process.env.NEXT_PUBLIC_JOUL_TOKEN_ADDRESS as `0x${string}`,
  });

  const producerOffers = offers.filter(
    (offer) => offer.producer.toLowerCase() === address?.toLowerCase()
  );

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting offer with values:', {
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
        energyType
      });
      
      await createOffer(Number(quantity), Number(pricePerUnit), energyType);
      setQuantity("");
      setPricePerUnit("");
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // Convert Wh to kWh for display
  const formatQuantity = (whQuantity: bigint) => {
    return (Number(whQuantity) / 1000).toFixed(3);
  };

  // Format price from wei/Wh to MATIC/kWh
  const formatPrice = (weiPerWh: bigint) => {
    // Convert from wei/Wh to MATIC/kWh by multiplying by 1000 (to get per kWh) and formatting to MATIC
    const weiPerKwh = weiPerWh * BigInt(1000);
    return formatEther(weiPerKwh);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Producer Dashboard</h1>
        
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

        {/* Create Offer and Active Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Create Offer Form */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Create Energy Offer</h2>
            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Energy Quantity (kWh)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || Number(val) >= 0) {
                      setQuantity(val);
                    }
                  }}
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.001"
                  placeholder="Enter quantity in kWh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Price per kWh (MATIC)
                </label>
                <input
                  type="number"
                  value={pricePerUnit}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || Number(val) >= 0) {
                      setPricePerUnit(val);
                    }
                  }}
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.000001"
                  placeholder="Enter price in MATIC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Energy Type
                </label>
                <select
                  value={energyType}
                  onChange={(e) => setEnergyType(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="solar">Solar</option>
                  <option value="wind">Wind</option>
                  <option value="hydro">Hydro</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Offer
              </button>
            </form>
          </div>

          {/* Active Offers */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Your Active Offers</h2>
            <div className="space-y-4">
              {producerOffers
                .filter((offer) => offer.isActive && !offer.isCompleted)
                .map((offer, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-2 gap-2 text-white">
                      <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                      <p>Price: {formatPrice(offer.pricePerUnit)} MATIC/kWh</p>
                      <p>Type: {offer.energyType}</p>
                      <p>Status: {offer.isValidated ? "Validated" : "Pending"}</p>
                    </div>
                  </div>
                ))}
              {producerOffers.filter((offer) => offer.isActive && !offer.isCompleted)
                .length === 0 && <p className="text-gray-400">No active offers</p>}
            </div>
          </div>
        </div>

        {/* Sales History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Sales History</h2>
          <div className="space-y-4">
            {producerOffers
              .filter((offer) => offer.isCompleted)
              .map((offer, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white">
                    <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                    <p>Price: {formatPrice(offer.pricePerUnit)} MATIC/kWh</p>
                    <p>Type: {offer.energyType}</p>
                    <p>Buyer: {offer.buyer}</p>
                    <p className="col-span-2">
                      Total: {formatEther(offer.pricePerUnit * offer.quantity)} MATIC
                    </p>
                  </div>
                </div>
              ))}
            {producerOffers.filter((offer) => offer.isCompleted).length === 0 && (
              <p className="text-gray-400">No completed sales</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
