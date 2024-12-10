"use client";

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/energy-exchange';
import { parseEther, formatEther, decodeEventLog, type Hash } from 'viem';
import { useToast } from '../components/ui/use-toast';
import { useUserManagementContext } from './user-management-provider';

interface EnergyOffer {
  id: bigint; // Add offerId to the interface
  producer: `0x${string}`;
  quantity: bigint;
  pricePerUnit: bigint;
  energyType: string;
  timestamp: bigint;
  isActive: boolean;
  buyer: `0x${string}`;
  isValidated: boolean;
  isCompleted: boolean;
}

type OfferResponse = readonly [`0x${string}`, bigint, bigint, string, bigint, boolean, `0x${string}`, boolean, boolean];

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
  cancelOffer: (offerId: bigint) => Promise<void>;
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
    return 'Insufficient funds to complete the transaction. Please check your ETH balance.';
  }

  if (errorMessage.includes('User already registered')) {
    return 'This address is already registered.';
  }

  if (errorMessage.includes('execution reverted')) {
    const revertReason = errorData.replace('Reverted ', '');
    return `Transaction failed: ${revertReason || 'Unknown reason'}`;
  }

  if (errorMessage.includes('network changed')) {
    return 'Network changed. Please ensure you are connected to Sepolia Testnet.';
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
    id, // Include the offerId
    producer: offerResponse[0],
    quantity: offerResponse[1],
    pricePerUnit: offerResponse[2],
    energyType: offerResponse[3],
    timestamp: offerResponse[4],
    isActive: offerResponse[5],
    buyer: offerResponse[6],
    isValidated: offerResponse[7],
    isCompleted: offerResponse[8]
  };
}

// Debounce function to limit the rate of function calls
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

  // Create a memoized fetchOffers function
  const fetchOffers = useCallback(async () => {
    if (!publicClient || !isConnected) return;

    try {
      let index = 0;
      const fetchedOffers: EnergyOffer[] = [];
      const batchSize = 10; // Fetch offers in batches
      
      while (index < 100) { // Set a reasonable upper limit
        try {
          const promises = [];
          for (let i = 0; i < batchSize; i++) {
            promises.push(
              publicClient.readContract({
                address: contractAddress,
                abi,
                functionName: 'offers',
                args: [BigInt(index + i)],
              })
            );
          }

          const responses = await Promise.allSettled(promises);
          let hasValidResponse = false;

          responses.forEach((response, i) => {
            if (response.status === 'fulfilled') {
              hasValidResponse = true;
              fetchedOffers.push(convertToOffer(response.value as OfferResponse, BigInt(index + i)));
            }
          });

          if (!hasValidResponse) {
            break; // No valid responses in this batch, we've reached the end
          }

          index += batchSize;
        } catch (error) {
          break; // Error fetching this batch, we've reached the end
        }
      }

      setOffers(fetchedOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  }, [publicClient, isConnected, contractAddress]);

  // Create a debounced version of fetchOffers
  const debouncedFetchOffers = useCallback(
    debounce(() => {
      fetchOffers();
    }, 1000), // Wait 1 second between fetches
    [fetchOffers]
  );

  // Initial fetch and event setup
  useEffect(() => {
    if (isInitialLoad) {
      fetchOffers();
      setIsInitialLoad(false);
    }

    // Set up event listeners for offer-related events
    if (publicClient) {
      const unwatch = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'OfferCreated',
        onLogs: debouncedFetchOffers,
      });

      return () => {
        unwatch();
      };
    }
  }, [publicClient, isConnected, contractAddress, fetchOffers, debouncedFetchOffers, isInitialLoad]);

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
    if (!isConnected) {
      setOffers([]);
      setCurrentUserState(null);
    }
  }, [isConnected]);

  const { writeContractAsync } = useWriteContract();

  const handleAddUser = async (userAddress: string, isProducer: boolean) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    if (!address) {
      throw new Error('No wallet address found');
    }

    console.log('Adding user with params:', {
      contractAddress,
      userAddress,
      isProducer,
      callerAddress: address
    });

    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'addUser',
        args: [userAddress as `0x${string}`, isProducer],
      });

      toast({
        title: "Adding User",
        description: "Please wait while the user is being added...",
      });

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      console.log('Transaction receipt:', receipt);

      toast({
        title: "User Added",
        description: `Successfully added user as ${isProducer ? 'producer' : 'consumer'}.`,
      });
    } catch (error) {
      console.error('Add user error:', error);
      const errorMessage = parseContractError(error);
      toast({
        title: "Failed to Add User",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
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
      // Convert quantity from kWh to Wh
      const quantityWh = BigInt(Math.floor(quantity * 1000));
      
      // Convert price from MATIC/kWh to MATIC/Wh first, then to wei
      const pricePerWhInMatic = pricePerUnit / 1000;
      const pricePerWhInWei = parseEther(pricePerWhInMatic.toString());

      console.log('Creating offer with params:', {
        quantity: quantityWh.toString(),
        pricePerUnit: pricePerWhInWei.toString(),
        energyType
      });

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
        description: "Your energy offer has been successfully created.",
      });

      // Manually trigger a fetch after creating an offer
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

  const handlePurchaseOffer = async (offerId: bigint, totalPrice: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
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

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "Purchase Successful",
        description: "Your energy purchase has been completed.",
      });

      // Manually trigger a fetch after purchase
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

      // Manually trigger a fetch after validation
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

  const handleCancelOffer = async (offerId: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'cancelUnvalidatedOffer',
        args: [offerId],
      });

      toast({
        title: "Cancelling Offer",
        description: "Please wait while the offer is being cancelled...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "Offer Cancelled",
        description: "The offer has been successfully cancelled.",
      });

      // Manually trigger a fetch after cancellation
      await fetchOffers();
    } catch (error) {
      console.error('Cancel offer error:', error);
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
    cancelOffer: handleCancelOffer,
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
