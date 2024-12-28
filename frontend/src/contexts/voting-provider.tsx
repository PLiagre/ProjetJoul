import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/joul-voting';
import { useToast } from '../components/ui/use-toast';
import { useUserManagementContext } from './user-management-provider';
import { Address, PublicClient } from 'viem';

interface VoterInfo {
  isRegistered: boolean;
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
  registerVoter: (address: string) => Promise<void>;
  vote: (proposalId: number) => Promise<void>;
  startVotingSession: () => Promise<void>;
  endVotingSession: () => Promise<void>;
  tallyVotes: () => Promise<void>;
  winningDistribution: Distribution | null;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

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

  return `Transaction failed: ${errorMessage || 'Unknown error'}`;
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

  // Fetch voter info
  useEffect(() => {
    if (!publicClient || !isConnected || !address) return;

    const fetchVoterInfo = async () => {
      try {
        const result = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'getVoter',
          args: [address as Address],
        });
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
        const result = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'workflowStatus',
        });
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

  const handleRegisterVoter = async (voterAddress: string) => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'addVoter',
        args: [voterAddress as Address],
        account: address,
      });

      const hash = await walletClient.writeContract(request);

      toast({
        title: "Registering Voter",
        description: "Please wait while the voter is being registered...",
      });

      await publicClient.waitForTransactionReceipt({ hash });

      toast({
        title: "Voter Registered",
        description: "The voter has been successfully registered.",
      });
    } catch (error) {
      console.error('Register voter error:', error);
      toast({
        title: "Registration Failed",
        description: parseContractError(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleVote = async (proposalId: number) => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {
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

      await publicClient.waitForTransactionReceipt({ hash });

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

  const handleStartVotingSession = async () => {
    if (!walletClient || !isConnected || !publicClient || !address) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'startVotingSession',
        account: address,
      });

      const hash = await walletClient.writeContract(request);

      toast({
        title: "Starting Voting Session",
        description: "Please wait while the voting session is being started...",
      });

      await publicClient.waitForTransactionReceipt({ hash });

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
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'endVotingSession',
        account: address,
      });

      const hash = await walletClient.writeContract(request);

      toast({
        title: "Ending Voting Session",
        description: "Please wait while the voting session is being ended...",
      });

      await publicClient.waitForTransactionReceipt({ hash });

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
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: 'tallyVotes',
        account: address,
      });

      const hash = await walletClient.writeContract(request);

      toast({
        title: "Tallying Votes",
        description: "Please wait while the votes are being tallied...",
      });

      await publicClient.waitForTransactionReceipt({ hash });

      // Fetch winning distribution
      const result = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'getWinningDistribution',
      });

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

  const value = {
    voterInfo,
    workflowStatus,
    registerVoter: handleRegisterVoter,
    vote: handleVote,
    startVotingSession: handleStartVotingSession,
    endVotingSession: handleEndVotingSession,
    tallyVotes: handleTallyVotes,
    winningDistribution,
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
