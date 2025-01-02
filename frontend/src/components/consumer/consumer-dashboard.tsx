"use client";

import { useAccount, useBalance } from "wagmi";
import { useEnergyExchange } from "../../contexts/energy-exchange-provider";
import { formatEther, parseEther, keccak256 } from "viem";
import { useJoulToken } from "../../hooks/useJoulToken";
import { CONTRACT_ADDRESSES } from "../../lib/wagmi-config";
import { VotingComponent } from "../shared/voting-component";
import { useState, useCallback } from "react";

export function ConsumerDashboard() {
  const { address } = useAccount();
  const { offers, currentUser, commitToPurchase, purchaseOffer } = useEnergyExchange();
  const [pendingPurchases, setPendingPurchases] = useState<{[key: string]: { secret: `0x${string}`, totalPricePol: string }}>({});

  const { data: polBalance } = useBalance({
    address: address,
  });

  const { balance: joulBalance } = useJoulToken();

  // Format to 1 decimal place since we deal with 0.5 JOUL increments
  const formattedJoulBalance = joulBalance ? Number(joulBalance).toFixed(1) : "0";

  // Add access control checks
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Veuillez connecter votre portefeuille</h1>
      </div>
    );
  }

  if (currentUser?.isProducer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Accès Restreint</h1>
        <p className="text-gray-400">Les producteurs ne peuvent pas accéder au tableau de bord consommateur.</p>
      </div>
    );
  }

  // Format quantity from Wh to kWh for display
  const formatQuantity = (whQuantity: bigint) => {
    return (Number(whQuantity) / 1000).toFixed(0);
  };

  // Convertit le prix de wei/Wh en POL/kWh
  const formatPrice = (weiPerWh: bigint) => {
    const weiPerKwh = weiPerWh * BigInt(1000);
    return formatEther(weiPerKwh);
  };

  // Generate a random secret and its commitment
  const generateSecretAndCommitment = useCallback(() => {
    // Generate a random 32-byte secret
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const secret = `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
    
    // Generate commitment by hashing the secret
    const commitment = keccak256(secret);
    
    return { secret, commitment };
  }, []);

  const handleInitiatePurchase = async (offerId: bigint, totalPriceInPol: string) => {
    try {
      const { secret, commitment } = generateSecretAndCommitment();
      
      // Submit commitment
      await commitToPurchase(commitment);
      
      // Store secret and price for the actual purchase
      setPendingPurchases(prev => ({
        ...prev,
        [offerId.toString()]: { secret, totalPricePol: totalPriceInPol }
      }));
    } catch (error) {
      console.error("Erreur lors de l'initiation de l'achat:", error);
    }
  };

  const handleCompletePurchase = async (offerId: bigint) => {
    try {
      const purchaseInfo = pendingPurchases[offerId.toString()];
      if (!purchaseInfo) {
        throw new Error("Aucun achat en attente trouvé");
      }

      const totalPriceInWei = parseEther(purchaseInfo.totalPricePol);
      await purchaseOffer(offerId, totalPriceInWei, purchaseInfo.secret);
      
      // Clear the pending purchase
      setPendingPurchases(prev => {
        const newState = { ...prev };
        delete newState[offerId.toString()];
        return newState;
      });
    } catch (error) {
      console.error("Erreur lors de la finalisation de l'achat:", error);
    }
  };

  // Filter active offers (validated by Enedis and available for purchase)
  const activeOffers = offers.filter((offer) => {
    return (
      !offer.isPendingCreation &&
      offer.isActive &&
      !offer.isCompleted &&
      offer.buyer === '0x0000000000000000000000000000000000000000' &&
      offer.producer.toLowerCase() !== address?.toLowerCase() &&
      offer.producer !== '0x0000000000000000000000000000000000000000'
    );
  });

  // Filter user's purchases
  const userPurchases = offers.filter(
    (offer) => 
      address && 
      offer.buyer !== '0x0000000000000000000000000000000000000000' &&
      offer.buyer.toLowerCase() === address.toLowerCase() && // User is buyer
      !offer.isPendingCreation // Not pending creation
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Banner Section - Reduced height from h-72 to h-60 */}
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
          <h1 className="text-3xl font-bold mb-8 text-white">Tableau de Bord Consommateur</h1>

          {/* Balances Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Soldes</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#225577] rounded-lg p-4">
                <p className="text-gray-300 mb-2 font-medium">Solde POL</p>
                <p className="text-2xl font-semibold text-white">{polBalance?.formatted || "0"} POL</p>
              </div>
              <div className="bg-[#225577] rounded-lg p-4">
                <p className="text-gray-300 mb-2 font-medium">Solde JOUL</p>
                <p className="text-2xl font-semibold text-white">{formattedJoulBalance} JOUL</p>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Left Column - Available Offers */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">Offres d'Énergie Disponibles</h2>
              <div className="space-y-4">
                {activeOffers.map((offer) => {
                  const totalPriceInPol = formatEther(offer.pricePerUnit * offer.quantity);
                  const isPending = pendingPurchases[offer.id.toString()];
                  
                  return (
                    <div key={offer.id.toString()} className="bg-[#225577] rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-2 text-gray-300 mb-4">
                        <p>Producteur: {offer.producer}</p>
                        <p>Type d'Énergie: {offer.energyType}</p>
                        <p>Quantité: {formatQuantity(offer.quantity)} kWh</p>
                        <p>Prix par kWh: {formatPrice(offer.pricePerUnit)} POL</p>
                        <p className="col-span-2">Prix Total: {totalPriceInPol} POL</p>
                      </div>
                      {!isPending ? (
                        <button
                          onClick={() => handleInitiatePurchase(offer.id, totalPriceInPol)}
                          className="w-full px-4 py-2 bg-[#18ad65] text-white rounded hover:bg-[#18ad65]/80 transition-colors"
                        >
                          Initier l'Achat
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCompletePurchase(offer.id)}
                          className="w-full px-4 py-2 bg-[#18ad65] text-white rounded hover:bg-[#18ad65]/80 transition-colors"
                        >
                          Finaliser l'Achat
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Stacked Sections */}
            <div className="space-y-8">
              {/* Pending Purchases */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">Achats en Attente</h2>
                <div className="space-y-4">
                  {userPurchases
                    .filter(offer => !offer.isValidated && !offer.isCompleted)
                    .map((offer) => (
                      <div key={offer.id.toString()} className="bg-[#225577] rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-2 text-gray-300">
                          <p>Producteur: {offer.producer}</p>
                          <p>Type d'Énergie: {offer.energyType}</p>
                          <p>Quantité: {formatQuantity(offer.quantity)} kWh</p>
                          <p>Prix par kWh: {formatPrice(offer.pricePerUnit)} POL</p>
                          <p>Statut: {offer.isValidated ? "Validé" : offer.isCompleted ? "Rejeté" : "En Attente"}</p>
                          <p>Prix Total: {formatEther(offer.pricePerUnit * offer.quantity)} POL</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Active Purchases */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">Achats Actifs</h2>
                <div className="space-y-4">
                  {userPurchases
                    .filter(offer => offer.isValidated)
                    .map((offer) => (
                      <div key={offer.id.toString()} className="bg-[#225577] rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-2 text-gray-300">
                          <p>Producteur: {offer.producer}</p>
                          <p>Type d'Énergie: {offer.energyType}</p>
                          <p>Quantité: {formatQuantity(offer.quantity)} kWh</p>
                          <p>Prix par kWh: {formatPrice(offer.pricePerUnit)} POL</p>
                          <p>Statut: {offer.isValidated ? "Validé" : offer.isCompleted ? "Rejeté" : "En Attente"}</p>
                          <p>Prix Total: {formatEther(offer.pricePerUnit * offer.quantity)} POL</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Voting Section */}
          <div className="mb-8">
            <VotingComponent />
          </div>

          {/* Purchase History */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Historique des Achats</h2>
            <div className="space-y-4">
              {userPurchases.map((offer) => (
                <div key={offer.id.toString()} className="bg-[#225577] rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 text-gray-300">
                    <p>Producteur: {offer.producer}</p>
                    <p>Type d'Énergie: {offer.energyType}</p>
                    <p>Quantité: {formatQuantity(offer.quantity)} kWh</p>
                    <p>Prix par kWh: {formatPrice(offer.pricePerUnit)} POL</p>
                    <p>Statut: {offer.isValidated ? "Validé" : offer.isCompleted ? "Rejeté" : "En Attente"}</p>
                    <p>Prix Total: {formatEther(offer.pricePerUnit * offer.quantity)} POL</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
