import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { getAddress, abi, DISTRIBUTION_PROPOSALS, VOTE_COST } from '../contracts/joul-voting';
import { useToast } from '../components/ui/use-toast';
import { useUserManagementContext } from './user-management-provider';
import { Address, PublicClient } from 'viem';

interface VoterInfo {
  hasVoted: boolean;
  votedProposalId: bigint;
}

interface Distribution {
  producerShare: number;
  enedisShare: number;
  joulShare: number;
  poolShare: number;
}

interface VotingContextType {
  voterInfo: VoterInfo | null;
  workflowStatus: number;
  vote: (proposalId: number) => Promise<void>;
  startVotingSession: () => Promise<void>;
  endVotingSession: () => Promise<void>;
  tallyVotes: () => Promise<void>;
  winningDistribution: Distribution | null;
  getProposalVoteCount: (proposalId: number) => Promise<bigint>;
  winningProposalId: bigint | null;
  proposals: typeof DISTRIBUTION_PROPOSALS;
  refreshState: () => Promise<void>;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

const MAX_RETRIES = 5;
const BASE_DELAY = 2000; // 2 seconds base delay
const MAX_DELAY = 30000; // 30 seconds maximum delay

function getBackoffDelay(retryCount: number): number {
  // Exponential backoff with max delay
  const exponentialDelay = Math.min(
    BASE_DELAY * Math.pow(2, retryCount),
    MAX_DELAY
  );
  // Add random jitter (±20% of delay)
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  return exponentialDelay + jitter;
}

function parseContractError(error: any): string {
  if (error.cause?.data?.message) {
    return error.cause.data.message;
  }

  const errorMessage = error.message || '';

  if (errorMessage.includes('user rejected')) {
    return 'Transaction was rejected by the user.';
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds to complete the transaction.';
  }

  if (errorMessage.toLowerCase().includes('json-rpc')) {
    return 'Network connection issue. Please try again.';
  }

  return `Transaction failed: ${errorMessage || 'Unknown error'}`;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry based on error type
      const shouldRetry = 
        error.message?.toLowerCase().includes('json-rpc') ||
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.includes('429') ||
        error.message?.includes('Too Many Requests');
      
      if (!shouldRetry || i === retries - 1) {
        throw error;
      }
      
      // Calculate delay based on retry count
      const delay = getBackoffDelay(i);
      
      // Log retry attempt
      console.log(`Retry attempt ${i + 1}/${retries}, waiting ${Math.round(delay/1000)}s...`);
      if (error.message?.includes('429')) {
        console.log('Rate limit hit, backing off...');
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function VotingProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient() as PublicClient;
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();
  const { isAdmin } = useUserManagementContext();
  const contractAddress = getAddress(chainId);

  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<number>(0);
  const [winningDistribution, setWinningDistribution] = useState<Distribution | null>(null);
  const [winningProposalId, setWinningProposalId] = useState<bigint | null>(null);

  // Fetch winning proposal ID when votes are tallied
  useEffect(() => {
    if (!publicClient || !isConnected || workflowStatus !== 3) return;

    const fetchWinningProposalId = async () => {
      try {
        const result = await withRetry(() => 
          publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'winningProposalID',
          })
        );
        setWinningProposalId(result as bigint);
      } catch (error) {
        console.error('Error fetching winning proposal ID:', error);
      }
    };

    fetchWinningProposalId();
  }, [publicClient, isConnected, workflowStatus, contractAddress]);

  // Fetch voter info
  useEffect(() => {
    if (!publicClient || !isConnected || !address) return;

    const fetchVoterInfo = async () => {
      try {
        const result = await withRetry(() =>
          publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'getVoter',
            args: [address as Address],
          })
        );
        setVoterInfo(result as VoterInfo);
      } catch (error) {
        console.error('Error fetching voter info:', error);
      }
    };

    fetchVoterInfo();
  }, [publicClient, isConnected, address, contractAddress]);

  // Fetch workflow status
  useEffect(() => {
    if (!publicClient || !isConnected) return;

    const fetchWorkflowStatus = async () => {
      try {
        const result = await withRetry(() =>
          publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'workflowStatus',
          })
        );
        setWorkflowStatus(Number(result));
      } catch (error) {
        console.error('Error fetching workflow status:', error);
      }
    };

    fetchWorkflowStatus();

    // Watch for workflow status changes
    const unwatch = publicClient.watchContractEvent({
      address: contractAddress,
      abi,
      eventName: 'WorkflowStatusChange',
      onLogs: () => {
        fetchWorkflowStatus();
      },
    });

    return () => {
      unwatch();
    };
  }, [publicClient, isConnected, contractAddress]);

  const getProposalVoteCount = async (proposalId: number): Promise<bigint> => {
    if (!publicClient || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const result = await withRetry(() =>
        publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'getProposalVoteCount',
          args: [BigInt(proposalId)],
        })
      );
      return result as bigint;
    } catch (error) {
      console.error('Error getting proposal vote count:', error);
      throw error;
    }
  };

  const handleVote = async (proposalId: number) => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {
      // Check JOUL token balance and approval
      const joulTokenAddress = await withRetry(() =>
        publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'joulToken',
        })
      ) as Address;

      // Check balance
      const balance = await withRetry(async () => {
        const result = await publicClient.readContract({
        address: joulTokenAddress,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [address],
      });
        return result as bigint;
      });

      if (typeof balance === 'bigint' && balance < VOTE_COST) {
        throw new Error('Insufficient JOUL tokens. You need 1 JOUL token to vote.');
      }

      // Approve JOUL token spending
      const { request: approveRequest } = await publicClient.simulateContract({
        address: joulTokenAddress,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }],
        functionName: 'approve',
        args: [contractAddress, VOTE_COST],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await withRetry(() => publicClient.waitForTransactionReceipt({ hash: approveHash }));

      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'setVote',
        args: [BigInt(proposalId)],
        account: address,
      });

      const hash = await walletClient.writeContract(request);

      toast({
        title: "Submitting Vote",
        description: "Please wait while your vote is being submitted...",
      });

      await withRetry(() => publicClient.waitForTransactionReceipt({ hash }));

      toast({
        title: "Vote Submitted",
        description: "Your vote has been successfully recorded.",
      });
    } catch (error) {
      console.error('Vote error:', error);
      toast({
        title: "Vote Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshState = useCallback(async () => {
    if (!publicClient || !isConnected) return;

    try {
      // Refresh workflow status
      const status = await withRetry(() => 
        publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'workflowStatus',
        })
      );
      setWorkflowStatus(Number(status));

      // Refresh winning proposal if votes are tallied
      if (Number(status) === 2) {
        const winningId = await withRetry(() =>
          publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'winningProposalID',
          })
        );
        setWinningProposalId(winningId as bigint);
      }
    } catch (error) {
      console.error('Error refreshing state:', error);
    }
  }, [publicClient, isConnected, contractAddress]);

  const handleStartVotingSession = async () => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {

      const { request } = await withRetry(() => publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'startVotingSession',
        account: address,
      }));

      const hash = await withRetry(() => walletClient.writeContract(request));

      toast({
        title: "Starting Voting Session",
        description: "Please wait while the voting session is being started...",
      });

      await withRetry(() => publicClient.waitForTransactionReceipt({ hash }));
      await refreshState();

      toast({
        title: "Voting Session Started",
        description: "The voting session has been successfully started.",
      });
    } catch (error) {
      console.error('Start voting session error:', error);
      toast({
        title: "Failed to Start Voting Session",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEndVotingSession = async () => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const { request } = await withRetry(() => publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'endVotingSession',
        account: address,
      }));

      const hash = await withRetry(() => walletClient.writeContract(request));

      toast({
        title: "Ending Voting Session",
        description: "Please wait while the voting session is being ended...",
      });

      await withRetry(() => publicClient.waitForTransactionReceipt({ hash }));
      await refreshState();

      toast({
        title: "Voting Session Ended",
        description: "The voting session has been successfully ended.",
      });
    } catch (error) {
      console.error('End voting session error:', error);
      toast({
        title: "Failed to End Voting Session",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleTallyVotes = async () => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const { request } = await withRetry(() => publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'tallyVotes',
        account: address,
      }));

      const hash = await withRetry(() => walletClient.writeContract(request));

      toast({
        title: "Tallying Votes",
        description: "Please wait while the votes are being tallied...",
      });

      await withRetry(() => publicClient.waitForTransactionReceipt({ hash }));
      await refreshState();

      // Fetch winning distribution
      const result = await withRetry(() =>
        publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'getWinningDistribution',
        })
      );

      const distribution = result as any;
      setWinningDistribution({
        producerShare: Number(distribution.producerShare),
        enedisShare: Number(distribution.enedisShare),
        joulShare: Number(distribution.joulShare),
        poolShare: Number(distribution.poolShare),
      });

      toast({
        title: "Votes Tallied",
        description: "The votes have been successfully tallied.",
      });
    } catch (error) {
      console.error('Tally votes error:', error);
      toast({
        title: "Failed to Tally Votes",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const value: VotingContextType = {
    voterInfo: voterInfo,
    workflowStatus: workflowStatus,
    vote: handleVote,
    startVotingSession: handleStartVotingSession,
    endVotingSession: handleEndVotingSession,
    tallyVotes: handleTallyVotes,
    winningDistribution: winningDistribution,
    getProposalVoteCount: getProposalVoteCount,
    winningProposalId: winningProposalId,
    proposals: DISTRIBUTION_PROPOSALS,
    refreshState: refreshState,
  };

  return (
    <VotingContext.Provider value={value}>
      {children}
    </VotingContext.Provider>
  );
}

export function useVoting() {
  const context = useContext(VotingContext);
  if (context === undefined) {
    throw new Error('useVoting must be used within a VotingProvider');
  }
  return context;
}
