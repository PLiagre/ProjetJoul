import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/energy-exchange';
import { parseEther, formatEther, decodeEventLog, type Hash } from 'viem';
import { useToast } from '../components/ui/use-toast';
import { useUserManagementContext } from './user-management-provider';
import { useUserManagementContract } from '../contracts/user-management';
import { getContractAddresses } from '../lib/wagmi-config';
import { generateNFTMetadata, uploadToIPFS } from '../services/ipfs-service';

interface EnergyOffer {
  id: bigint;
  producer: `0x${string}`;
  quantity: bigint;
  pricePerUnit: bigint;
  energyType: string;
  isActive: boolean;
  buyer: `0x${string}`;
  isValidated: boolean;
  isCompleted: boolean;
  isPendingCreation: boolean;
  ipfsUri: string;
}

type OfferResponse = readonly [`0x${string}`, bigint, bigint, string, boolean, `0x${string}`, boolean, boolean, boolean, string];

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
  commitToPurchase: (commitment: `0x${string}`) => Promise<void>;
  purchaseOffer: (offerId: bigint, totalPrice: bigint, secret: `0x${string}`) => Promise<void>;
  validateDelivery: (offerId: bigint, isValid: boolean) => Promise<void>;
  validateOfferCreation: (offerId: bigint, isValid: boolean) => Promise<void>;
  hasEnedisRole: (address: string) => Promise<boolean>;
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
    if (revertReason.includes('Invalid commitment')) {
      return 'Invalid commitment. Please ensure you have committed to the purchase first.';
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
    isActive: offerResponse[4],
    buyer: offerResponse[5],
    isValidated: offerResponse[6],
    isCompleted: offerResponse[7],
    isPendingCreation: offerResponse[8],
    ipfsUri: offerResponse[9]
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
    if (!publicClient || !isConnected) {
      console.log('fetchOffers: No publicClient or not connected');
      return;
    }

    try {
      console.log('Starting fetchOffers...');
      const fetchedOffers: EnergyOffer[] = [];
      const batchSize = 50;  // Increased batch size for better initial load
      let consecutiveErrors = 0;
      let index = 0;
      
      while (consecutiveErrors < 3 && index < 1000) {
        const promises = Array.from({ length: batchSize }, (_, i) => {
          const currentIndex = index + i;
          return publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'offers',
            args: [BigInt(currentIndex)],
          }).then(response => {
            return {
              success: true,
              data: response as OfferResponse,
              index: currentIndex
            };
          }).catch(error => {
            console.log(`Failed to read offer at index ${currentIndex}:`, error);
            return {
              success: false,
              data: null,
              index: currentIndex
            };
          });
        });

        const results = await Promise.all(promises);
        let validOffersInBatch = 0;

        for (const result of results) {
          if (result.success && result.data) {
            const offer = convertToOffer(result.data, BigInt(result.index));
            if (offer.producer !== '0x0000000000000000000000000000000000000000') {
              console.log(`Found valid offer at index ${result.index}:`, {
                producer: offer.producer,
                quantity: offer.quantity.toString(),
                pricePerUnit: offer.pricePerUnit.toString(),
                energyType: offer.energyType,
                isActive: offer.isActive,
                isPendingCreation: offer.isPendingCreation
              });
              fetchedOffers.push(offer);
              validOffersInBatch++;
            }
          }
        }

        if (validOffersInBatch === 0) {
          consecutiveErrors++;
        } else {
          consecutiveErrors = 0;
        }

        index += batchSize;
      }

      console.log(`Fetched ${fetchedOffers.length} valid offers`);
      +
      fetchedOffers.sort((a, b) => Number(b.id - a.id));
      setOffers(fetchedOffers);
    } catch (error) {
      console.error('Error in fetchOffers:', error);
    }
  }, [publicClient, isConnected, contractAddress]);

  const debouncedFetchOffers = useCallback(
    debounce(() => {
      fetchOffers();
    }, 500),
    [fetchOffers]
  );

  useEffect(() => {
    if (isConnected && publicClient) {
      fetchOffers();
    }
  }, [isConnected, publicClient, fetchOffers]);

  useEffect(() => {
    if (!publicClient) return;
  
    const handleOfferPurchased = async (log: any) => {
      console.log('OfferPurchased event received:', log);
      await fetchOffers();
    };

    const handleOfferCreated = async (log: any) => {
      console.log('OfferCreated event received:', log);
      try {
        const decodedLog = decodeEventLog({
          abi,
          data: log[0].data,
          topics: log[0].topics,
        });
        console.log('Decoded OfferCreated event:', decodedLog);
      } catch (error) {
        console.error('Error decoding OfferCreated event:', error);
      }
      await fetchOffers();
    };
  
    const handleOtherEvents = debounce(() => {
      console.log('Other event received, fetching offers...');
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
        onLogs: handleOfferCreated,
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
      }),
      publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'CommitmentSubmitted',
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
        buyer: offer.buyer?.toLowerCase(),
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
        title: "Initiating User Removal",
        description: "Please wait while the removal process is being initiated...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "User Removed",
        description: "The user has been successfully removed.",
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
      console.log('Starting offer creation with params:', {
        quantity,
        pricePerUnit,
        energyType,
        contractAddress
      });

      const quantityWh = BigInt(Math.floor(quantity * 1000));
      const pricePerWhInMatic = pricePerUnit / 1000;
      const pricePerWhInWei = parseEther(pricePerWhInMatic.toString());

      console.log('Converted values:', {
        quantityWh: quantityWh.toString(),
        pricePerWhInMatic,
        pricePerWhInWei: pricePerWhInWei.toString()
      });

      console.log('Calling createOffer on contract...');
      if (!publicClient) {
        throw new Error('Public client not initialized');
      }

      // Get current gas price and add 20% buffer
      const gasPrice = await publicClient.getGasPrice();
      const bufferedGasPrice = gasPrice * BigInt(12) / BigInt(10);

      // Estimate gas with a 50% buffer
      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi,
        functionName: 'createOffer',
        args: [quantityWh, pricePerWhInWei, energyType],
        account: address as `0x${string}`,
      });
      const bufferedGas = gasEstimate * BigInt(15) / BigInt(10);

      console.log('Creating offer with parameters:', {
        quantityWh: quantityWh.toString(),
        pricePerWhInWei: pricePerWhInWei.toString(),
        energyType,
        gasLimit: bufferedGas.toString(),
        gasPrice: bufferedGasPrice.toString()
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'createOffer',
        args: [quantityWh, pricePerWhInWei, energyType],
        gas: bufferedGas,
        gasPrice: bufferedGasPrice,
      });

      console.log('Transaction hash:', hash);

      toast({
        title: "Creating Offer",
        description: "Please wait while your offer is being created...",
      });

      console.log('Waiting for transaction receipt...');
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      console.log('Transaction receipt:', receipt);

      // Check for OfferCreated event
      if (receipt) {
        const offerCreatedEvents = receipt.logs
          .map(log => {
            try {
              return decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics,
              });
            } catch {
              return null;
            }
          })
          .filter(event => event?.eventName === 'OfferCreated');

        console.log('OfferCreated events:', offerCreatedEvents);
      }

      toast({
        title: "Offer Created",
        description: "Your energy offer has been created and is pending Enedis validation.",
      });

      console.log('Refreshing offers list...');
      await fetchOffers();
      console.log('Offers list refreshed');
    } catch (error) {
      console.error('Create offer error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        cause: error instanceof Error ? error.cause : undefined
      });
      console.error('Create offer error:', error);
      toast({
        title: "Failed to Create Offer",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCommitToPurchase = async (commitment: `0x${string}`) => {
    if (!writeContractAsync || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }
    try {
      console.log('Committing to purchase with params:', {
        commitment,
        contractAddress,
        connectedAddress: address
      });

      // Get current gas price and add 20% buffer
      const gasPrice = await publicClient.getGasPrice();
      const bufferedGasPrice = gasPrice * BigInt(12) / BigInt(10);

      // Estimate gas and add 50% buffer
      // Use a fixed gas limit for commitToPurchase
      const fixedGasLimit = BigInt(100000); // Fixed gas limit that should be sufficient

      console.log('Transaction parameters:', {
        gasPrice: bufferedGasPrice.toString(),
        gasLimit: fixedGasLimit.toString()
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'commitToPurchase',
        args: [commitment],
        gas: fixedGasLimit,
        gasPrice: bufferedGasPrice,
      });

      toast({
        title: "Submitting Commitment",
        description: "Please wait while your purchase commitment is being submitted...",
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast({
        title: "Commitment Submitted",
        description: "Your purchase commitment has been submitted successfully.",
      });
    } catch (error) {
      console.error('Commit to purchase error:', error);
      toast({
        title: "Commitment Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handlePurchaseOffer = async (offerId: bigint, totalPrice: bigint, secret: `0x${string}`) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }
    try {
      console.log('Purchasing offer:', {
        offerId: offerId.toString(),
        totalPrice: totalPrice.toString(),
        secret
      });
  
      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'purchaseOffer',
        args: [offerId, secret],
        value: totalPrice,
      });
  
      toast({
        title: "Processing Purchase",
        description: "Please wait while your purchase is being processed...",
      });
  
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      console.log('Purchase transaction receipt:', receipt);
  
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

      // Récupérer les données de l'offre
      const offer = offers.find(o => o.id === offerId);
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Si l'offre est valide, générer et uploader les métadonnées IPFS
      let ipfsUri = '';
      if (isValid) {
        try {
          const metadata = generateNFTMetadata(
            offerId.toString(),
            Number(offer.quantity),
            offer.energyType,
            offer.producer,
            Math.floor(Date.now() / 1000)
          );
          ipfsUri = await uploadToIPFS(metadata);
          console.log('IPFS URI generated:', ipfsUri);
        } catch (error) {
          console.error('Failed to generate IPFS URI:', error);
          toast({
            title: "IPFS Error",
            description: "Failed to generate IPFS metadata. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Mettre à jour l'URI dans le contrat EnergyExchange
      const gasPrice = await publicClient.getGasPrice();
      const bufferedGasPrice = gasPrice * BigInt(12) / BigInt(10);

      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi,
        functionName: 'validateOfferCreation',
        args: [offerId, isValid, ipfsUri],
        account: address,
      });
      const bufferedGas = gasEstimate * BigInt(15) / BigInt(10);

      console.log('Transaction parameters:', {
        gasPrice: bufferedGasPrice.toString(),
        gasLimit: bufferedGas.toString(),
        ipfsUri
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'validateOfferCreation',
        args: [offerId, isValid, ipfsUri],
        gas: bufferedGas,
        gasPrice: bufferedGasPrice,
      });

      toast({
        title: "Validating Offer Creation",
        description: "Please wait while the offer creation is being validated...",
      });

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 3
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

  const hasEnedisRole = useCallback(async (userAddress: string): Promise<boolean> => {
    if (!publicClient || !contractAddress) return false;
    try {
      const ENEDIS_ROLE = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'ENEDIS_ROLE',
      }) as `0x${string}`;
      
      const hasRole = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'hasRole',
        args: [ENEDIS_ROLE, userAddress as `0x${string}`],
      }) as boolean;
      
      return hasRole;
    } catch (error) {
      console.error("Failed to check ENEDIS role:", error);
      return false;
    }
  }, [publicClient, contractAddress]);

  const handleValidateDelivery = async (offerId: bigint, isValid: boolean) => {
    if (!writeContractAsync || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }
    try {
      console.log('Validating delivery with params:', {
        offerId: offerId.toString(),
        isValid,
        contractAddress,
        connectedAddress: address
      });

      const gasPrice = await publicClient.getGasPrice();
      const bufferedGasPrice = gasPrice * BigInt(12) / BigInt(10);

      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi,
        functionName: 'validateAndDistribute',
        args: [offerId, isValid],
        account: address,
      });
      const bufferedGas = gasEstimate * BigInt(15) / BigInt(10);

      console.log('Transaction parameters:', {
        gasPrice: bufferedGasPrice.toString(),
        gasLimit: bufferedGas.toString()
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: 'validateAndDistribute',
        args: [offerId, isValid],
        gas: bufferedGas,
        gasPrice: bufferedGasPrice,
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

  const value = {
    currentUser: currentUserState,
    offers,
    addUser: handleAddUser,
    removeUser: handleRemoveUser,
    createOffer: handleCreateOffer,
    commitToPurchase: handleCommitToPurchase,
    purchaseOffer: handlePurchaseOffer,
    validateDelivery: handleValidateDelivery,
    validateOfferCreation: handleValidateOfferCreation,
    hasEnedisRole,
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
