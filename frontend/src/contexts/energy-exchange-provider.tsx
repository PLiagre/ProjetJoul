"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/energy-exchange';
import { parseEther, formatEther, decodeEventLog, type Hash } from 'viem';
import { useToast } from '../components/ui/use-toast';

interface EnergyOffer {
  producer: `0x${string}`;
  energyAmount: bigint;
  pricePerUnit: bigint;
  isActive: boolean;
  isValidated: boolean;
  consumer: `0x${string}`;
  totalPrice: bigint;
}

interface User {
  address: `0x${string}`;
  isRegistered: boolean;
  isProducer: boolean;
  isAdmin: boolean;
}

interface EnergyExchangeContextType {
  currentUser: User | null;
  offers: EnergyOffer[];
  offerCount: bigint;
  registerUser: (isProducer: boolean) => Promise<void>;
  createOffer: (energyAmount: number, pricePerUnit: number) => Promise<void>;
  purchaseEnergy: (offerId: bigint, totalPrice: bigint) => Promise<void>;
  validateDelivery: (offerId: bigint) => Promise<void>;
  cancelOffer: (offerId: bigint) => Promise<void>;
}

const EnergyExchangeContext = createContext<EnergyExchangeContextType | undefined>(undefined);

function parseContractError(error: any): string {
  console.error('Contract error:', error);

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

  return 'An error occurred while processing the transaction. Please try again.';
}

export function EnergyExchangeProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [offers, setOffers] = useState<EnergyOffer[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!isConnected) {
      setOffers([]);
    }
  }, [isConnected]);

  const contractAddress = getAddress(chainId);

  const { data: userData, error: userError } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'users',
    args: address && isConnected ? [address] : undefined,
  });

  useEffect(() => {
    if (!isConnected || !address) return;
    
    const interval = setInterval(async () => {
      try {
        if (!publicClient) return;
        await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'users',
          args: [address],
        });
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, address, publicClient, contractAddress]);

  const { data: contractOwner } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'owner',
  });

  const { data: offerCount } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'offerCount',
  });

  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const loadOffers = async () => {
      if (!contractAddress || !offerCount || !publicClient || !isConnected) return;
      
      try {
        const newOffers: EnergyOffer[] = [];
        for (let i = 1; i <= Number(offerCount); i++) {
          const offer = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'energyOffers',
            args: [BigInt(i)],
          }) as unknown as EnergyOffer;
          newOffers.push(offer);
        }
        setOffers(newOffers);
      } catch (error) {
        console.error('Failed to load offers:', error);
        toast({
          title: "Error Loading Offers",
          description: parseContractError(error),
          variant: "destructive",
        });
      }
    };

    loadOffers();
  }, [contractAddress, offerCount, publicClient, isConnected, toast]);

  const handleRegisterUser = async (isProducer: boolean) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    if (!publicClient) {
      throw new Error('Network connection error');
    }
    if (!address) {
      throw new Error('Wallet address not found');
    }
    
    try {
      console.log('Registering user:', { address, isProducer, contractAddress });
      
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'registerUser',
        args: [isProducer],
      });

      console.log('Registration transaction sent:', hash);

      toast({
        title: "Registration Pending",
        description: "Please wait while your registration is being processed...",
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);

      const userRegisteredEvent = receipt.logs.find(log => {
        try {
          const event = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === 'UserRegistered';
        } catch {
          return false;
        }
      });

      if (!userRegisteredEvent) {
        throw new Error('Registration transaction completed but no UserRegistered event found');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'users',
        args: [address],
      }) as readonly [boolean, boolean];

      const [isRegistered, userIsProducer] = result;
      if (!isRegistered) {
        throw new Error('Registration verification failed - user not marked as registered');
      }

      toast({
        title: "Registration Successful",
        description: `Successfully registered as a ${isProducer ? 'producer' : 'consumer'}.`,
      });

      console.log('Registration successful:', { isRegistered, isProducer: userIsProducer });

    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = parseContractError(error);
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    }
  };

  const handleCreateOffer = async (energyAmount: number, pricePerUnit: number) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'createEnergyOffer',
        args: [BigInt(energyAmount), parseEther(pricePerUnit.toString())],
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

  const handlePurchaseEnergy = async (offerId: bigint, totalPrice: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'purchaseEnergy',
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

  const handleValidateDelivery = async (offerId: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'validateEnergyDelivery',
        args: [offerId],
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

  const currentUser: User | null = isConnected && userData && address ? {
    address,
    isRegistered: (userData as readonly [boolean, boolean])[0],
    isProducer: (userData as readonly [boolean, boolean])[1],
    isAdmin: contractOwner ? address.toLowerCase() === (contractOwner as `0x${string}`).toLowerCase() : false,
  } : null;

  const value = {
    currentUser,
    offers,
    offerCount: offerCount || BigInt(0),
    registerUser: handleRegisterUser,
    createOffer: handleCreateOffer,
    purchaseEnergy: handlePurchaseEnergy,
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
