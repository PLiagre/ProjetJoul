import React from 'react';
import { useAccount } from 'wagmi';
import { useVoting } from '../../contexts/voting-provider';

const proposals = [
  {
    id: 0,
    description: 'Distribution 1',
    shares: {
      producer: 65,
      enedis: 15,
      joul: 10,
      pool: 10,
    },
  },
  {
    id: 1,
    description: 'Distribution 2',
    shares: {
      producer: 75,
      enedis: 20,
      joul: 3,
      pool: 2,
    },
  },
  {
    id: 2,
    description: 'Distribution 3',
    shares: {
      producer: 65,
      enedis: 20,
      joul: 5,
      pool: 10,
    },
  },
];

export function VotingComponent() {
  const { address } = useAccount();
  const { voterInfo, workflowStatus, vote } = useVoting();

  const handleVote = async (proposalId: number) => {
    try {
      await vote(proposalId);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (!voterInfo?.isRegistered) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-white">You are not registered as a voter.</p>
      </div>
    );
  }

  if (voterInfo.hasVoted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-white">
          You have already voted for proposal {Number(voterInfo.votedProposalId)}
        </p>
      </div>
    );
  }

  if (workflowStatus !== 1) { // VotingSessionStarted
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-white">Voting session is not active.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Vote for MATIC Distribution</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className="bg-gray-700 rounded-lg p-4"
          >
            <h3 className="text-xl font-bold text-white mb-2">
              {proposal.description}
            </h3>
            <div className="space-y-2 text-white mb-4">
              <p>Producer: {proposal.shares.producer}%</p>
              <p>Enedis: {proposal.shares.enedis}%</p>
              <p>Joul: {proposal.shares.joul}%</p>
              <p>Pool: {proposal.shares.pool}%</p>
            </div>
            <button
              onClick={() => handleVote(proposal.id)}
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
