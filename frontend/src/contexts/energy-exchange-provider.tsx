import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/energy-exchange';
import { parseEther, formatEther, decodeEventLog, type Hash } from 'viem';
import { useToast } from '../components/ui/use-toast';
import { useUserManagementContext } from './user-management-provider';
import { useUserManagementContract } from '../contracts/user-management';
import { getContractAddresses } from '../lib/wagmi-config';


interface EnergyOffer {
  id: bigint;
  producer: `0x${string}`;
  quantity: bigint;
  pricePerUnit: bigint;
  energyType: string;
  timestamp: bigint;
  isActive: boolean;
  buyer: `0x${string}`;
  isValidated: boolean;
  isCompleted: boolean;
  isPendingCreation: boolean;
}

type OfferResponse = readonly [`0x${string}`, bigint, bigint, string, bigint, boolean, `0x${string}`, boolean, boolean, boolean];

interface User {
  address: `0x${string}`;
  isRegistered: boolean;
  isProducer: boolean;
  isAdmin: boolean;
}

interface EnergyExchangeContextType {
  currentUser: User | null;
  offers: EnergyOffer[];
  addUser: (address: string, isProducer: boolean) => Promise<void>;
  removeUser: (address: string) => Promise<void>;
  createOffer: (quantity: number, pricePerUnit: number, energyType: string) => Promise<void>;
  purchaseOffer: (offerId: bigint, totalPrice: bigint) => Promise<void>;
  validateDelivery: (offerId: bigint, isValid: boolean) => Promise<void>;
  validateOfferCreation: (offerId: bigint, isValid: boolean) => Promise<void>;
  cancelExpiredOffer: (offerId: bigint) => Promise<void>;
}

const EnergyExchangeContext = createContext<EnergyExchangeContextType | undefined>(undefined);

function parseContractError(error: any): string {
  console.error('Contract error details:', {
    message: error.message,
    cause: error.cause,
    data: error.data,
    details: error
  });

  if (error.cause?.data?.message) {
    return error.cause.data.message;
  }

  const errorMessage = error.message || '';
  const errorData = error.data || '';

  if (errorMessage.includes('user rejected')) {
    return 'Transaction was rejected by the user.';
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds to complete the transaction. Please check your MATIC balance.';
  }

  if (errorMessage.includes('User already registered')) {
    return 'This address is already registered.';
  }

  if (errorMessage.includes('execution reverted')) {
    const revertReason = errorData.replace('Reverted ', '');
    if (revertReason.includes('Validation deadline not exceeded')) {
      return 'Cannot cancel offer yet - validation period has not expired.';
    }
    if (revertReason.includes('Offer already completed')) {
      return 'This offer has already been completed.';
    }
    if (revertReason.includes('Offer not purchased')) {
      return 'This offer has not been purchased yet.';
    }
    if (revertReason.includes('Not a producer')) {
      return 'Only registered producers can perform this action.';
    }
    if (revertReason.includes('Not a consumer')) {
      return 'Only registered consumers can perform this action.';
    }
    if (revertReason.includes('Not authorized')) {
      return 'You are not authorized to perform this action. Only ENEDIS can validate offers.';
    }
    if (revertReason.includes('Internal JSON-RPC error')) {
      return 'Network error. Please try again with higher gas limit.';
    }
    return `Transaction failed: ${revertReason || 'Unknown reason'}`;
  }

  if (errorMessage.includes('network changed')) {
    return 'Network changed. Please ensure you are connected to the correct network.';
  }

  if (errorMessage.includes('disconnected')) {
    return 'Wallet disconnected. Please reconnect and try again.';
  }

  if (errorMessage.includes('gas required exceeds allowance')) {
    return 'Transaction requires more gas than allowed. Please increase gas limit.';
  }

  if (errorMessage.includes('nonce')) {
    return 'Transaction nonce error. Please reset your wallet or try again.';
  }

  return `Transaction failed: ${errorMessage || 'Unknown error'}`;
}

function convertToOffer(offerResponse: OfferResponse, id: bigint): EnergyOffer {
  return {
    id,
    producer: offerResponse[0],
    quantity: offerResponse[1],
    pricePerUnit: offerResponse[2],
    energyType: offerResponse[3],
    timestamp: offerResponse[4],
    isActive: offerResponse[5],
    buyer: offerResponse[6],
    isValidated: offerResponse[7],
    isCompleted: offerResponse[8],
    isPendingCreation: offerResponse[9]
  };
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function EnergyExchangeProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [offers, setOffers] = useState<EnergyOffer[]>([]);
  const { toast } = useToast();
  const [currentUserState, setCurrentUserState] = useState<User | null>(null);
  const { isAdmin, isProducer, isConsumer } = useUserManagementContext();
  const contractAddress = getAddress(chainId);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const userManagementContract = useUserManagementContract();

  const fetchOffers = useCallback(async () => {
    if (!publicClient || !isConnected) return;

    try {
      const fetchedOffers: EnergyOffer[] = [];
      const batchSize = 50;  // Increased batch size for better initial load
      let consecutiveErrors = 0;
      let index = 0;
      
      // Continue fetching until we hit 3 consecutive batches with all errors
      while (consecutiveErrors < 3 && index < 1000) {
        const promises = Array.from({ length: batchSize }, (_, i) => {
          return publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'offers',
            args: [BigInt(index + i)],
          }).then(response => ({
            success: true,
            data: response as OfferResponse,
            index: index + i
          })).catch(error => ({
            success: false,
            data: null,
            index: index + i
          }));
        });

        const results = await Promise.all(promises);
        let validOffersInBatch = 0;

        for (const result of results) {
          if (result.success && result.data) {
            const offer = convertToOffer(result.data, BigInt(result.index));
            // Include all offers that have a valid producer address
            if (offer.producer !== '0x0000000000000000000000000000000000000000') {
              fetchedOffers.push(offer);
              validOffersInBatch++;
            }
          }
        }

        if (validOffersInBatch === 0) {
          consecutiveErrors++;
        } else {
          consecutiveErrors = 0;  // Reset if we found valid offers
        }

        index += batchSize;
      }

      console.log(`Fetched ${fetchedOffers.length} valid offers`);
      
      // Sort offers by ID in descending order (newest first)
      fetchedOffers.sort((a, b) => Number(b.id - a.id));
      setOffers(fetchedOffers);
    } catch (error) {
      console.error('Error in fetchOffers:', error);
    }
  }, [publicClient, isConnected, contractAddress]);

  // Remove debounce for direct fetchOffers calls
  const debouncedFetchOffers = useCallback(
    debounce(() => {
      fetchOffers();
    }, 500), // Reduced debounce time
    [fetchOffers]
  );

  // Separate effect for initial load and wallet connection
  useEffect(() => {
    if (isConnected && publicClient) {
      fetchOffers();
    }
  }, [isConnected, publicClient, fetchOffers]);

  // Separate effect for event watching
  useEffect(() => {
    if (!publicClient) return;
  
    const handleOfferPurchased = async (log: any) => {
      console.log('OfferPurchased event received:', log);
      await fetchOffers(); // Immediate fetch for purchase events
    };
  
    const handleOtherEvents = debounce(() => {
      fetchOffers();
    }, 500);
  
    const unwatchEvents = [
      publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'OfferPurchased',
        onLogs: handleOfferPurchased,
      }),
      publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'OfferCreated',
        onLogs: handleOtherEvents,
      }),
      publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'OfferValidated',
        onLogs: handleOtherEvents,
      }),
      publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'OfferCreationValidated',
        onLogs: handleOtherEvents,
      })
    ];
  
    return () => {
      unwatchEvents.forEach(unwatch => unwatch());
    };
  }, [publicClient, contractAddress, fetchOffers]);

  useEffect(() => {
    async function updateUserStatus() {
      if (!isConnected || !address) {
        setCurrentUserState(null);
        return;
      }

      try {
        const [isAdminStatus, isProducerStatus] = await Promise.all([
          isAdmin(address),
          isProducer(address)
        ]);

        setCurrentUserState({
          address: address as `0x${string}`,
          isRegistered: true,
          isProducer: isProducerStatus,
          isAdmin: isAdminStatus
        });
      } catch (error) {
        console.error('Error checking user status:', error);
        setCurrentUserState(null);
      }
    }

    updateUserStatus();
  }, [address, isConnected, isAdmin, isProducer]);

  useEffect(() => {
    if (offers.length > 0) {
      const offersWithBuyers = offers.filter(
        offer => offer.buyer !== '0x0000000000000000000000000000000000000000'
      );
      
      console.log('Current offers with buyers:', offersWithBuyers.map(offer => ({
        id: offer.id.toString(),
        buyer: offer.buyer,
        isPendingCreation: offer.isPendingCreation,
        isActive: offer.isActive,
        isCompleted: offer.isCompleted,
        isValidated: offer.isValidated
      })));
    }
  }, [offers]);

  const { writeContractAsync } = useWriteContract();

  const handleAddUser = async (userAddress: string, isProducerRole: boolean) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    if (!address) {
      throw new Error('No wallet address found');
    }

    try {
      // Vérifier les rôles avant d'appeler le smart contract
      const formattedAddress = userAddress as `0x${string}`;
      console.log('Checking roles for address:', formattedAddress);
      
      const hasAdminRole = await isAdmin(formattedAddress);
      console.log('Has admin role:', hasAdminRole);

      if (hasAdminRole) {
        console.log('Blocking addition: address is admin');
        toast({
          title: "Failed to Add User",
          description: "Cette adresse est un administrateur et ne peut pas avoir de rôle supplémentaire.",
          variant: "destructive",
        });
        return Promise.reject(new Error("Cette adresse est un administrateur et ne peut pas avoir de rôle supplémentaire."));
      }

      const [hasProducerRole, hasConsumerRole] = await Promise.all([
        isProducer(formattedAddress),
        isConsumer(formattedAddress)
      ]);
      console.log('Has producer role:', hasProducerRole);
      console.log('Has consumer role:', hasConsumerRole);

      if (hasProducerRole || hasConsumerRole) {
        console.log('Blocking addition: address already has a role');
        toast({
          title: "Failed to Add User",
          description: "Cette adresse a déjà un rôle attribué (producteur ou consommateur).",
          variant: "destructive",
        });
        return Promise.reject(new Error("Cette adresse a déjà un rôle attribué (producteur ou consommateur)."));
      }

      console.log('No existing roles found, proceeding with addition');
      toast({
        title: "Adding User",
        description: "Please wait while the user is being added...",
      });

      const hash = await writeContractAsync({
        ...userManagementContract,
        functionName: 'addUser',
        args: [formattedAddress, isProducerRole],
      });

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "User Added",
        description: `Successfully added user as ${isProducerRole ? 'producer' : 'consumer'}.`,
      });
    } catch (error) {
      console.error('Add user error:', error);
      const errorMessage = parseContractError(error);
      toast({
        title: "Failed to Add User",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
};

  const handleRemoveUser = async (userAddress: string) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'removeUser',
        args: [userAddress as `0x${string}`],
      });

      toast({
        title: "Removing User",
        description: "Please wait while the user is being removed...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "User Removed",
        description: "Successfully removed user.",
      });
    } catch (error) {
      console.error('Remove user error:', error);
      toast({
        title: "Failed to Remove User",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCreateOffer = async (quantity: number, pricePerUnit: number, energyType: string) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const quantityWh = BigInt(Math.floor(quantity * 1000));
      const pricePerWhInMatic = pricePerUnit / 1000;
      const pricePerWhInWei = parseEther(pricePerWhInMatic.toString());

      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'createOffer',
        args: [quantityWh, pricePerWhInWei, energyType],
      });

      toast({
        title: "Creating Offer",
        description: "Please wait while your offer is being created...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "Offer Created",
        description: "Your energy offer has been created and is pending Enedis validation.",
      });

      // Immediately fetch offers after creating a new one
      await fetchOffers();
    } catch (error) {
      console.error('Create offer error:', error);
      toast({
        title: "Failed to Create Offer",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleValidateOfferCreation = async (offerId: bigint, isValid: boolean) => {
    if (!writeContractAsync || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }
    try {
      console.log('Validating offer creation with params:', {
        offerId: offerId.toString(),
        isValid,
        contractAddress,
        connectedAddress: address
      });

      // Get the current gas price and add a buffer
      const gasPrice = await publicClient.getGasPrice();
      const bufferedGasPrice = gasPrice * BigInt(12) / BigInt(10); // Add 20% buffer

      // Estimate gas with a buffer
      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi,
        functionName: 'validateOfferCreation',
        args: [offerId, isValid],
        account: address,
      });
      const bufferedGas = gasEstimate * BigInt(15) / BigInt(10); // Add 50% buffer

      console.log('Transaction parameters:', {
        gasPrice: bufferedGasPrice.toString(),
        gasLimit: bufferedGas.toString()
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'validateOfferCreation',
        args: [offerId, isValid],
        gas: bufferedGas,
        gasPrice: bufferedGasPrice,
      });

      toast({
        title: "Validating Offer Creation",
        description: "Please wait while the offer creation is being validated...",
      });

      // Wait for more confirmations on Polygon Amoy
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 3 // Wait for 3 confirmations
      });

      console.log('Transaction receipt:', receipt);

      toast({
        title: "Offer Creation Validated",
        description: `The energy offer creation has been ${isValid ? 'validated' : 'rejected'}.`,
      });

      await fetchOffers();
    } catch (error) {
      console.error('Offer creation validation error:', error);
      toast({
        title: "Validation Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handlePurchaseOffer = async (offerId: bigint, totalPrice: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      console.log('Purchasing offer:', {  // Add this
        offerId: offerId.toString(),
        totalPrice: totalPrice.toString()
      });
  
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'purchaseOffer',
        args: [offerId],
        value: totalPrice,
      });
  
      toast({
        title: "Processing Purchase",
        description: "Please wait while your purchase is being processed...",
      });
  
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      console.log('Purchase transaction receipt:', receipt);  // Add this
  
      toast({
        title: "Purchase Successful",
        description: "Your energy purchase has been completed.",
      });
  
      await fetchOffers();
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleValidateDelivery = async (offerId: bigint, isValid: boolean) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'validateAndDistribute',
        args: [offerId, isValid],
      });

      toast({
        title: "Validating Delivery",
        description: "Please wait while the delivery is being validated...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "Delivery Validated",
        description: "The energy delivery has been successfully validated.",
      });

      await fetchOffers();
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCancelExpiredOffer = async (offerId: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'cancelExpiredOffer',
        args: [offerId],
      });

      toast({
        title: "Cancelling Expired Offer",
        description: "Please wait while the expired offer is being cancelled...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "Expired Offer Cancelled",
        description: "The expired offer has been successfully cancelled and funds returned.",
      });

      await fetchOffers();
    } catch (error) {
      console.error('Cancel expired offer error:', error);
      toast({
        title: "Cancellation Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    currentUser: currentUserState,
    offers,
    addUser: handleAddUser,
    removeUser: handleRemoveUser,
    createOffer: handleCreateOffer,
    purchaseOffer: handlePurchaseOffer,
    validateDelivery: handleValidateDelivery,
    validateOfferCreation: handleValidateOfferCreation,
    cancelExpiredOffer: handleCancelExpiredOffer,
  };

  return (
    <EnergyExchangeContext.Provider value={value}>
      {children}
    </EnergyExchangeContext.Provider>
  );
}

export function useEnergyExchange() {
  const context = useContext(EnergyExchangeContext);
  if (context === undefined) {
    throw new Error('useEnergyExchange must be used within a EnergyExchangeProvider');
  }
  return context;
}
