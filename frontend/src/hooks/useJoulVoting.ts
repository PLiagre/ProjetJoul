'use client';

import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContractAddresses } from './useContractAddresses';
import { abi } from '../contracts/joul-voting';
import { Address } from 'viem';

export const useJoulVoting = () => {
  const { joulVoting } = useContractAddresses();

  const contract = {
    abi,
    address: joulVoting as Address,
  } as const;

  const useWorkflowStatus = () => {
    return useReadContract({
      ...contract,
      functionName: 'workflowStatus' as const,
    }) as { data: number | undefined; error: Error | null };
  };

  const useVoterInfo = (address: Address) => {
    return useReadContract({
      ...contract,
      functionName: 'getVoter' as const,
      args: [address],
    }) as { data: { isRegistered: boolean; hasVoted: boolean; votedProposalId: bigint } | undefined; error: Error | null };
  };

  const useProposalVoteCount = (proposalId: number) => {
    return useReadContract({
      ...contract,
      functionName: 'getProposalVoteCount' as const,
      args: [BigInt(proposalId)],
    }) as { data: bigint | undefined; error: Error | null };
  };

  const useWinningDistribution = () => {
    return useReadContract({
      ...contract,
      functionName: 'getWinningDistribution' as const,
    }) as { data: { producerShare: number; enedisShare: number; joulShare: number; poolShare: number } | undefined; error: Error | null };
  };

  const useContractWrite = (
    functionName: string,
    prepare: (writeContract: any) => Promise<`0x${string}`>,
    onSuccess?: () => void
  ) => {
    const { data: hash, writeContract, status } = useWriteContract();
    const { status: txStatus } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
      if (status === 'success' && txStatus === 'success' && onSuccess) {
        onSuccess();
      }
    }, [status, txStatus, onSuccess]);

    return {
      isPending: txStatus === 'pending' && !['idle', 'error'].includes(status),
      isSuccess: status === 'success' && txStatus === 'success',
      write: () => prepare(writeContract),
    };
  };

  const useRegisterVoter = (voterAddress: Address, onSuccess?: () => void) => {
    return useContractWrite(
      'addVoter',
      (writeContract) =>
        writeContract({
          ...contract,
          functionName: 'addVoter' as const,
          args: [voterAddress],
        }),
      onSuccess
    );
  };

  const useVote = (proposalId: bigint, onSuccess?: () => void) => {
    return useContractWrite(
      'setVote',
      (writeContract) =>
        writeContract({
          ...contract,
          functionName: 'setVote' as const,
          args: [proposalId],
        }),
      onSuccess
    );
  };

  const useStartVotingSession = (onSuccess?: () => void) => {
    return useContractWrite(
      'startVotingSession',
      (writeContract) =>
        writeContract({
          ...contract,
          functionName: 'startVotingSession' as const,
        }),
      onSuccess
    );
  };

  const useEndVotingSession = (onSuccess?: () => void) => {
    return useContractWrite(
      'endVotingSession',
      (writeContract) =>
        writeContract({
          ...contract,
          functionName: 'endVotingSession' as const,
        }),
      onSuccess
    );
  };

  const useTallyVotes = (onSuccess?: () => void) => {
    return useContractWrite(
      'tallyVotes',
      (writeContract) =>
        writeContract({
          ...contract,
          functionName: 'tallyVotes' as const,
        }),
      onSuccess
    );
  };

  return {
    useWorkflowStatus,
    useVoterInfo,
    useProposalVoteCount,
    useWinningDistribution,
    useRegisterVoter,
    useVote,
    useStartVotingSession,
    useEndVotingSession,
    useTallyVotes,
  };
};
