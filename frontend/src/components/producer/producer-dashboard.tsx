"use client";

import { useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { useJoulToken } from "../../hooks/useJoulToken";
import { useEnergyNFT, type EnergyData } from "../../hooks/useEnergyNFT";
import { formatEther } from "viem";
import { VotingComponent } from "../shared/voting-component";
import { useToast } from "../../components/ui/use-toast";
import Image from "next/image";
import { type Abi } from 'viem';

interface NFTDisplayProps {
  tokenId: number;
  getOpenSeaURL: (tokenId: string | number) => string;
  getEnergyTypeImage: (energyType: string) => string;
  contractAddress: `0x${string}`;
  abi: Abi;
}

function NFTDisplay({ tokenId, getOpenSeaURL, getEnergyTypeImage, contractAddress, abi }: NFTDisplayProps) {
  const { data: certificateData } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCertificateData',
    args: [BigInt(tokenId)],
  }) as { data: EnergyData | undefined };

  if (!certificateData) return null;

  return (
    <a 
      key={tokenId} 
      href={getOpenSeaURL(tokenId)}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-gray-600 rounded-lg p-2 flex flex-col items-center justify-center hover:bg-gray-500 transition-colors"
    >
      <div className="relative w-16 h-16 mb-1">
        <Image
          src={getEnergyTypeImage(certificateData.energyType)}
          alt={`NFT #${tokenId + 1} - ${certificateData.energyType}`}
          fill
          className="rounded-lg object-cover"
        />
      </div>
    </a>
  );
}

export function ProducerDashboard() {
  const { address } = useAccount();
  const { createOffer, offers, currentUser } = useEnergyExchange();
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [energyType, setEnergyType] = useState("solaire");

  const { data: maticBalance } = useBalance({
    address: address,
  });

  const { balance: joulBalance } = useJoulToken();
  const { toast } = useToast();
  const { balance: nftBalance, getOpenSeaURL, getEnergyTypeImage, contractAddress, abi } = useEnergyNFT();

  // JOUL balance is already formatted by the hook
  const formattedJoulBalance = joulBalance ? Number(joulBalance).toFixed(2) : "0";

  // Add access control checks
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Veuillez connecter votre portefeuille</h1>
      </div>
    );
  }

  if (!currentUser?.isProducer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Accès Restreint</h1>
        <p className="text-gray-400">Vous avez besoin des privilèges producteur pour accéder à cette page.</p>
      </div>
    );
  }

  const producerOffers = offers.filter(
    (offer) => offer.producer.toLowerCase() === address?.toLowerCase()
  );

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Soumission de l\'offre avec les valeurs:', {
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
        energyType
      });
      
      await createOffer(Number(quantity), Number(pricePerUnit), energyType);
      setQuantity("");
      setPricePerUnit("");
    } catch (error) {
      console.error("Erreur lors de la création de l'offre:", error);
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : "Échec de la création de l'offre";
      toast({
        title: "Erreur de Création d'Offre",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Convert Wh to kWh for display
  const formatQuantity = (whQuantity: bigint) => {
    return (Number(whQuantity) / 1000).toFixed(0);
  };

  // Format price from wei/Wh to POL/kWh
  const formatPrice = (weiPerWh: bigint) => {
    // Convert from wei/Wh to POL/kWh by multiplying by 1000 (to get per kWh) and formatting to POL
    const weiPerKwh = weiPerWh * BigInt(1000);
    return formatEther(weiPerKwh);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Banner Section */}
      <div className="w-full h-60 relative mb-8 bg-[#225577]">
        <img 
          src="/images/JoulLogo.png" 
          alt="Joul Banner" 
          className="w-full h-full object-contain object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
      </div>

      <div className="container mx-auto p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-white">Tableau de Bord Producteur</h1>
          
          {/* Balances Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Soldes</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#225577] rounded-lg p-4">
                <p className="text-gray-300 mb-2">Solde POL</p>
                <p className="text-white text-xl font-semibold">{maticBalance?.formatted || "0"} POL</p>
              </div>
              <div className="bg-[#225577] rounded-lg p-4">
                <p className="text-gray-300 mb-2">Solde JOUL</p>
                <p className="text-white text-xl font-semibold">{formattedJoulBalance} JOUL</p>
              </div>
              <div className="bg-[#225577] rounded-lg p-4">
                <p className="text-gray-300 mb-2">Certificats d'Énergie</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from({ length: Number(nftBalance || 0) }, (_, i) => (
                    <NFTDisplay
                      key={i}
                      tokenId={i}
                      getOpenSeaURL={getOpenSeaURL}
                      getEnergyTypeImage={getEnergyTypeImage}
                      contractAddress={contractAddress}
                      abi={abi}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Left Column - Create Offer Form */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">Créer une Offre d'Énergie</h2>
              <form onSubmit={handleCreateOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Quantité d'Énergie (kWh)
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
                    placeholder="Entrez la quantité en kWh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Prix par kWh (POL)
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
                    placeholder="Entrez le prix en POL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Type d'Énergie
                  </label>
                  <select
                    value={energyType}
                    onChange={(e) => setEnergyType(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="solaire">Solaire</option>
                    <option value="eolien">Éolien</option>
                    <option value="hydraulique">Hydraulique</option>
                    <option value="biomasse">Biomasse</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-[#18ad65] text-white rounded hover:bg-[#18ad65]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Créer l'Offre
                </button>
              </form>
            </div>

            {/* Right Column - Stacked Sections */}
            <div className="space-y-4">
              {/* Pending Offers */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-xl font-bold mb-1.5 text-white">Offres en Attente</h2>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-2">
                  {producerOffers
                    .filter((offer) => offer.isPendingCreation)
                    .map((offer) => (
                      <div key={`${offer.producer}-${offer.quantity.toString()}-${offer.pricePerUnit.toString()}`} className="bg-[#225577] rounded-lg p-2">
                        <div className="flex flex-wrap gap-1 text-white text-xs leading-snug">
                          <p className="w-full">{formatQuantity(offer.quantity)} kWh • {formatPrice(offer.pricePerUnit)} POL/kWh</p>
                          <p className="w-full">{offer.energyType} • En Attente de Validation Enedis</p>
                        </div>
                      </div>
                    ))}
                  {producerOffers.filter((offer) => offer.isPendingCreation).length === 0 && (
                    <p className="text-gray-400 text-sm">Aucune offre en attente</p>
                  )}
                </div>
              </div>

              {/* Active Offers */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-xl font-bold mb-1.5 text-white">Offres Actives</h2>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-2">
                  {producerOffers
                    .filter((offer) => 
                      !offer.isPendingCreation && 
                      offer.isActive && 
                      !offer.isCompleted && 
                      offer.buyer === '0x0000000000000000000000000000000000000000'
                    )
                    .map((offer) => (
                      <div key={`${offer.producer}-${offer.quantity.toString()}-${offer.pricePerUnit.toString()}`} className="bg-[#225577] rounded-lg p-2">
                        <div className="flex flex-wrap gap-1 text-white text-xs leading-snug">
                          <p className="w-full">{formatQuantity(offer.quantity)} kWh • {formatPrice(offer.pricePerUnit)} POL/kWh</p>
                          <p className="w-full">{offer.energyType} • En Cours</p>
                        </div>
                      </div>
                    ))}
                  {producerOffers.filter((offer) => 
                    !offer.isPendingCreation && 
                    offer.isActive && 
                    !offer.isCompleted && 
                    offer.buyer === '0x0000000000000000000000000000000000000000'
                  ).length === 0 && (
                    <p className="text-gray-400 text-sm">Aucune offre active</p>
                  )}
                </div>
              </div>

              {/* Sales History */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-xl font-bold mb-1.5 text-white">Historique des Ventes</h2>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-2">
                  {producerOffers
                    .filter((offer) => 
                      offer.isCompleted || 
                      (offer.buyer !== '0x0000000000000000000000000000000000000000' && offer.isValidated)
                    )
                    .map((offer) => (
                      <div key={`${offer.producer}-${offer.quantity.toString()}-${offer.pricePerUnit.toString()}`} className="bg-[#225577] rounded-lg p-2">
                        <div className="flex flex-wrap gap-1 text-white text-xs">
                          <p className="w-full">{formatQuantity(offer.quantity)} kWh • {formatPrice(offer.pricePerUnit)} POL/kWh</p>
                          <p className="w-full">{offer.energyType} • Total: {formatEther(offer.pricePerUnit * offer.quantity)} POL</p>
                          <p className="w-full truncate">Acheteur: {offer.buyer}</p>
                        </div>
                      </div>
                    ))}
                  {producerOffers.filter((offer) => 
                    offer.isCompleted || 
                    (offer.buyer !== '0x0000000000000000000000000000000000000000' && offer.isValidated)
                  ).length === 0 && (
                    <p className="text-gray-400 text-sm">Aucune vente complétée</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Voting Section - Now below the grid */}
          <div className="mb-8">
            <VotingComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
