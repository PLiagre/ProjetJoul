import React from 'react';
import { useAccount } from 'wagmi';
import { useVoting } from '../../contexts/voting-provider';
import { formatEther } from 'viem';
import { VOTE_COST } from '../../contracts/joul-voting';

export function VotingComponent() {
  const { address } = useAccount();
  const { voterInfo, workflowStatus, vote, proposals } = useVoting();

  const handleVote = async (proposalId: number) => {
    try {
      await vote(proposalId);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (voterInfo?.hasVoted) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-white text-sm">
          You have already voted for proposal {Number(voterInfo.votedProposalId) + 1}
        </p>
      </div>
    );
  }

  if (workflowStatus !== 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-white text-sm">Voting session is not active.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-xl font-bold mb-1.5 text-white">Vote for MATIC Distribution</h2>
      <div className="bg-gray-700 rounded-lg p-2 mb-3">
        <p className="text-white text-xs">Required JOUL tokens to vote: {formatEther(VOTE_COST)} JOUL</p>
        <p className="text-gray-400 text-xs">Note: JOUL tokens used for voting will be burned</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {proposals.map((proposal, index) => (
          <div key={index} className="bg-[#225577] rounded-lg p-2">
            <h3 className="text-sm font-bold text-white mb-1 text-center">
              Proposal {index + 1}
            </h3>
            <div className="space-y-0.5 text-white text-xs mb-2">
              <p>Producer: {proposal.producerShare}%</p>
              <p>Enedis: {proposal.enedisShare}%</p>
              <p>Joul: {proposal.joulShare}%</p>
              <p>Pool: {proposal.poolShare}%</p>
            </div>
            <button
              onClick={() => handleVote(index)}
              className="w-full px-2 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
            >
              Vote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
