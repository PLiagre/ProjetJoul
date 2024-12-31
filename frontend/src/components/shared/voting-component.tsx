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
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-white">
          You have already voted for proposal {Number(voterInfo.votedProposalId) + 1}
        </p>
      </div>
    );
  }

  if (workflowStatus !== 0) { // VotingSessionStarted is now 0
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-white">Voting session is not active.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Vote for MATIC Distribution</h2>
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <p className="text-white">Required JOUL tokens to vote: {formatEther(VOTE_COST)} JOUL</p>
        <p className="text-sm text-gray-400">Note: JOUL tokens used for voting will be burned</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {proposals.map((proposal, index) => (
          <div
            key={index}
            className="bg-gray-700 rounded-lg p-4"
          >
            <h3 className="text-xl font-bold text-white mb-2">
              Proposal {index + 1}
            </h3>
            <div className="space-y-2 text-white mb-4">
              <p>Producer: {proposal.producerShare}%</p>
              <p>Enedis: {proposal.enedisShare}%</p>
              <p>Joul: {proposal.joulShare}%</p>
              <p>Pool: {proposal.poolShare}%</p>
            </div>
            <button
              onClick={() => handleVote(index)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Vote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
