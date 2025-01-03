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
      console.error('Erreur de vote:', error);
    }
  };

  if (voterInfo?.hasVoted) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-white text-sm">
          Vous avez déjà voté pour la proposition {Number(voterInfo.votedProposalId) + 1}
        </p>
      </div>
    );
  }

  if (workflowStatus !== 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-white text-sm">La session de vote n'est pas active.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-xl font-bold mb-1.5 text-white">Vote pour la Distribution de MATIC</h2>
      <div className="bg-gray-700 rounded-lg p-2 mb-3">
        <p className="text-white text-xs">Jetons JOUL requis pour voter : {formatEther(VOTE_COST)} JOUL</p>
        <p className="text-gray-400 text-xs">Note : Les jetons JOUL utilisés pour voter seront brûlés</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {proposals.map((proposal, index) => (
          <div 
            key={`${proposal.producerShare}-${proposal.enedisShare}-${proposal.joulShare}-${proposal.poolShare}`} 
            className="bg-[#225577] rounded-lg p-2"
          >
            <h3 className="text-sm font-bold text-white mb-1 text-center">
              Proposition {index + 1}
            </h3>
            <div className="space-y-0.5 text-white text-xs mb-2">
              <p>Producteur : {proposal.producerShare}%</p>
              <p>Enedis : {proposal.enedisShare}%</p>
              <p>Joul : {proposal.joulShare}%</p>
              <p>Pool : {proposal.poolShare}%</p>
            </div>
            <button
              onClick={() => handleVote(index)}
              className="w-full px-2 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
            >
              Voter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
