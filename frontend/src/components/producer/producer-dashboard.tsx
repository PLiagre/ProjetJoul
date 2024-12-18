"use client";

import { useState } from "react";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { formatEther, formatUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../../lib/wagmi-config";

export function ProducerDashboard() {
  const { address } = useAccount();
  const { createOffer, offers, currentUser } = useEnergyExchange();
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [energyType, setEnergyType] = useState("solar");

  const { data: maticBalance } = useBalance({
    address: address,
  });

  const { data: joulBalance } = useBalance({
    address: address,
    token: CONTRACT_ADDRESSES.JOUL_TOKEN as `0x${string}`,
  });

  // Format JOUL balance with 18 decimals
  const formattedJoulBalance = joulBalance ? formatUnits(joulBalance.value, 18) : "0";

  // Read NFT balance
  const { data: nftBalance } = useContractRead({
    address: CONTRACT_ADDRESSES.ENERGY_NFT as `0x${string}`,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    args: address ? [address as `0x${string}`] : undefined,
  });

  // Add access control checks
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
      </div>
    );
  }

  if (!currentUser?.isProducer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
        <p className="text-gray-400">You need producer privileges to access this page.</p>
      </div>
    );
  }

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
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 mb-2">MATIC Balance</p>
              <p className="text-white text-xl font-semibold">{maticBalance?.formatted || "0"} MATIC</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 mb-2">JOUL Balance</p>
              <p className="text-white text-xl font-semibold">{formattedJoulBalance} JOUL</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 mb-2">Energy Certificates</p>
              <p className="text-white text-xl font-semibold">{nftBalance?.toString() || "0"} NFTs</p>
            </div>
          </div>
        </div>

        {/* NFT Badges Section */}
        {Number(nftBalance || 0) > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Energy Production Certificates</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: Number(nftBalance || 0) }, (_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-green-500 rounded-full mb-4 flex items-center justify-center">
                    <span className="text-4xl">⚡</span>
                  </div>
                  <p className="text-white text-center font-semibold">Energy Producer</p>
                  <p className="text-gray-400 text-sm text-center">Certificate #{i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Offer Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
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

        {/* Pending Offers */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Pending Offers</h2>
          <div className="space-y-4">
            {producerOffers
              .filter((offer) => offer.isPendingCreation)
              .map((offer, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white">
                    <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                    <p>Price: {formatPrice(offer.pricePerUnit)} MATIC/kWh</p>
                    <p>Type: {offer.energyType}</p>
                    <p>Status: Pending Enedis Validation</p>
                  </div>
                </div>
              ))}
            {producerOffers.filter((offer) => offer.isPendingCreation).length === 0 && (
              <p className="text-gray-400">No pending offers</p>
            )}
          </div>
        </div>

        {/* Active Offers */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Active Offers</h2>
          <div className="space-y-4">
            {producerOffers
              .filter((offer) => 
                !offer.isPendingCreation && 
                offer.isActive && 
                !offer.isCompleted && 
                offer.buyer === '0x0000000000000000000000000000000000000000'
              )
              .map((offer, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 gap-2 text-white">
                    <p>Quantity: {formatQuantity(offer.quantity)} kWh</p>
                    <p>Price: {formatPrice(offer.pricePerUnit)} MATIC/kWh</p>
                    <p>Type: {offer.energyType}</p>
                    <p>Status: Active</p>
                  </div>
                </div>
              ))}
            {producerOffers.filter((offer) => 
              !offer.isPendingCreation && 
              offer.isActive && 
              !offer.isCompleted && 
              offer.buyer === '0x0000000000000000000000000000000000000000'
            ).length === 0 && (
              <p className="text-gray-400">No active offers</p>
            )}
          </div>
        </div>

        {/* Sales History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Sales History</h2>
          <div className="space-y-4">
            {producerOffers
              .filter((offer) => 
                offer.isCompleted || 
                (offer.buyer !== '0x0000000000000000000000000000000000000000' && offer.isValidated)
              )
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
            {producerOffers.filter((offer) => 
              offer.isCompleted || 
              (offer.buyer !== '0x0000000000000000000000000000000000000000' && offer.isValidated)
            ).length === 0 && (
              <p className="text-gray-400">No completed sales</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
