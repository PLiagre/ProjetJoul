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
        <h1 className="text-2xl font-bold mb-4">Veuillez connecter votre portefeuille</h1>
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
        <h1 className="text-2xl font-bold mb-4">Accès Refusé</h1>
        <p className="text-gray-400">Vous avez besoin des privilèges administrateur pour accéder à cette page.</p>
      </div>
    );
  }

  const validateAddress = (address: string): string => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error("Format d'adresse Ethereum invalide");
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
        title: "Succès",
        description: `L'utilisateur ${checksummedAddress} a été ${isProducer ? 'ajouté comme producteur' : 'ajouté comme consommateur'}.`,
      });
    } catch (error: any) {
      console.error("Échec de l'ajout de l'utilisateur:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'ajout de l'utilisateur. Veuillez réessayer.",
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
        title: "Suppression Initiée",
        description: `Processus de suppression démarré pour ${checksummedAddress}. La suppression sera effective après ${GRACE_PERIOD / 3600} heures.`,
      });
    } catch (error: any) {
      console.error("Échec de l'initiation de la suppression:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'initiation de la suppression. Veuillez réessayer.",
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
        title: "Suppression Annulée",
        description: `Processus de suppression annulé pour ${checksummedAddress}.`,
      });
      setRemovalAddress("");
    } catch (error: any) {
      console.error("Échec de l'annulation de la suppression:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'annulation de la suppression. Veuillez réessayer.",
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
        title: "Suppression Finalisée",
        description: `L'utilisateur ${checksummedAddress} a été supprimé avec succès.`,
      });
      setRemovalAddress("");
    } catch (error: any) {
      console.error("Échec de la finalisation de la suppression:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de la finalisation de la suppression. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Format quantity from Wh to kWh for display
  const formatQuantity = (whQuantity: bigint) => {
    return (Number(whQuantity) / 1000).toFixed(0);
  };

  // Format price from wei/Wh to POL/kWh
  const formatPrice = (weiPerWh: bigint) => {
    const weiPerKwh = weiPerWh * BigInt(1000);
    return formatEther(weiPerKwh);
  };

  const handleValidateDelivery = async (offerId: bigint, isValid: boolean) => {
    try {
      await validateDelivery(offerId, isValid);
      toast({
        title: "Succès",
        description: `Le transfert d'énergie a été ${isValid ? 'validé' : 'rejeté'}.`,
      });
    } catch (error: any) {
      console.error("Échec de la validation de la livraison:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de la validation de la livraison. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleValidateOfferCreation = async (offerId: bigint, isValid: boolean) => {
    try {
      await validateOfferCreation(offerId, isValid);
      toast({
        title: "Succès",
        description: `La création de l'offre d'énergie a été ${isValid ? 'validée' : 'rejetée'}.`,
      });
    } catch (error: any) {
      console.error("Échec de la validation de l'offre:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de la validation de l'offre. Veuillez réessayer.",
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
          <h1 className="text-3xl font-bold mb-8 text-white">Tableau de Bord JOUL</h1>

          {/* Grid Layout for Pending Validations */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Pending Offer Creations Section */}
            {hasEnedis && (
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-xl font-bold mb-1.5 text-white">Offres en Attente de Validation</h2>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                  {pendingOfferCreations.map((offer) => (
                    <div key={offer.id.toString()} className="bg-[#225577] rounded-lg p-2">
                      <div className="flex flex-wrap gap-1 text-white text-xs leading-snug">
                        <p className="w-full">{formatQuantity(offer.quantity)} kWh • {formatPrice(offer.pricePerUnit)} POL/kWh</p>
                        <p className="w-full">{offer.energyType} • Producteur: {offer.producer}</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleValidateOfferCreation(offer.id, true)}
                          className="flex-1 px-2 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleValidateOfferCreation(offer.id, false)}
                          className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingOfferCreations.length === 0 && (
                    <p className="text-gray-400 text-sm">Aucune offre en attente</p>
                  )}
                </div>
              </div>
            )}

            {/* Pending Energy Transfers Section */}
            {hasEnedis && (
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-xl font-bold mb-1.5 text-white">Transferts d'Énergie en Attente</h2>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                  {pendingTransfers.map((offer) => (
                    <div key={offer.id.toString()} className="bg-[#225577] rounded-lg p-2">
                      <div className="flex flex-wrap gap-1 text-white text-xs leading-snug">
                        <p className="w-full">{formatQuantity(offer.quantity)} kWh • {formatPrice(offer.pricePerUnit)} POL/kWh</p>
                        <p className="w-full">{offer.energyType} • Total: {formatEther(offer.pricePerUnit * offer.quantity)} POL</p>
                        <p className="w-full">De: {offer.producer}</p>
                        <p className="w-full">À: {offer.buyer.slice(0, 6)}...{offer.buyer.slice(-4)}</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleValidateDelivery(offer.id, true)}
                          className="flex-1 px-2 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleValidateDelivery(offer.id, false)}
                          className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingTransfers.length === 0 && (
                    <p className="text-gray-400 text-sm">Aucun transfert en attente</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Management Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Gestion des Utilisateurs</h2>
            
            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Adresse de l'Utilisateur
                </label>
                <input
                  type="text"
                  value={newUserAddress}
                  onChange={(e) => setNewUserAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Veuillez entrer une adresse Ethereum valide (0x suivi de 40 caractères hexadécimaux)"
                />
              </div>

              <div className="flex items-center">
                <span className="text-sm font-medium text-white w-24 text-right mr-4">
                  Consommateur
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isProducer}
                  onClick={() => setIsProducer(!isProducer)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full
                    ${isProducer ? 'bg-[#18ad65]' : 'bg-gray-700'}
                    transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}
                >
                  <span className="sr-only">Choisir le type d'utilisateur</span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isProducer ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
                <span className="text-sm font-medium text-white w-24 ml-2">
                  Producteur
                </span>
              </div>

              <button
                type="submit"
                disabled={!newUserAddress}
                className="w-full px-4 py-2 bg-[#18ad65] text-white rounded hover:bg-[#18ad65]/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter l'Utilisateur
              </button>
            </form>

            {/* User Removal Section - Commented out */}
            {/*
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-white">Suppression d'Utilisateur</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Adresse de l'Utilisateur à Supprimer
                  </label>
                  <input
                    type="text"
                    value={removalAddress}
                    onChange={(e) => setRemovalAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    pattern="^0x[a-fA-F0-9]{40}$"
                    title="Veuillez entrer une adresse Ethereum valide (0x suivi de 40 caractères hexadécimaux)"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleInitiateRemoval}
                    disabled={isRemovingUser || !removalAddress}
                    className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Initier la Suppression
                  </button>
                  <button
                    onClick={handleCancelRemoval}
                    disabled={isRemovingUser || !removalAddress}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    Annuler la Suppression
                  </button>
                  <button
                    onClick={handleFinalizeRemoval}
                    disabled={isRemovingUser || !removalAddress}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Finaliser la Suppression
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Note: Après l'initiation de la suppression, il y a une période de grâce de {GRACE_PERIOD / 3600} heures avant que la suppression puisse être finalisée.
                  Pendant cette période, la suppression peut être annulée si nécessaire.
                </p>
              </div>
            </div>
            */}
          </div>

          {/* Instructions Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-white">
              <li>Gérez le processus de vote pour la distribution de POL dans la section supérieure</li>
              <li>Démarrez et terminez les sessions de vote au moment approprié</li>
              <li>Examinez les offres en attente de création</li>
              <li>Validez ou rejetez les nouvelles offres d'énergie des producteurs</li>
              <li>Examinez les transferts d'énergie en attente</li>
              <li>Validez les transferts après confirmation de la livraison d'énergie sur le réseau</li>
              <li>Rejetez les transferts si la livraison d'énergie ne peut pas être confirmée</li>
              <li>Utilisez la section de gestion des utilisateurs pour ajouter de nouveaux utilisateurs au système</li>
              <li>L'adresse doit être une adresse Ethereum valide (0x suivi de 40 caractères hexadécimaux)</li>
              <li>Vous devez avoir les privilèges administrateur pour gérer les utilisateurs et valider les transferts</li>
            </ul>
          </div>

          {/* Voting Management Component */}
          <VotingManagement />
        </div>
      </div>
    </div>
  );
}
