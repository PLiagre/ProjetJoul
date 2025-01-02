import React from 'react';
import { useVoting } from '../../contexts/voting-provider';
import { formatEther } from 'viem';
import { VOTE_COST } from '../../contracts/joul-voting';

export function VotingManagement() {
  const { 
    workflowStatus, 
    startVotingSession, 
    endVotingSession, 
    tallyVotes, 
    winningDistribution,
    getProposalVoteCount,
    winningProposalId,
    proposals
  } = useVoting();

  const [voteCounts, setVoteCounts] = React.useState<bigint[]>([]);

  // Fetch vote counts when voting session is ended or votes are tallied
  React.useEffect(() => {
    if (workflowStatus >= 1) {
      Promise.all(proposals.map((_, index) => getProposalVoteCount(index)))
        .then(setVoteCounts)
        .catch(console.error);
    }
  }, [workflowStatus, getProposalVoteCount, proposals]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return 'Voting Session Active';
      case 1:
        return 'Voting Session Ended';
      case 2:
        return 'Votes Tallied';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-xl font-bold mb-1.5 text-white">Voting Management</h2>
      
      <div className="mb-3 space-y-1.5">
        <div className="bg-gray-700 rounded-lg p-2">
          <h3 className="text-sm font-bold text-white mb-1">Distribution Proposals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {proposals.map((proposal, index) => (
              <div key={index} className="bg-[#225577] rounded-lg p-2">
                <div className="text-center mb-1">
                  <span className="text-white text-xs font-bold">Proposal {index + 1}</span>
                  {voteCounts[index] !== undefined && (
                    <div className="text-gray-300 text-xs">Votes: {voteCounts[index].toString()}</div>
                  )}
                  {winningProposalId !== null && Number(winningProposalId) === index && (
                    <div className="text-green-400 text-xs font-bold">Winner</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-white text-xs">
                  <p>Producer: {proposal.producerShare}%</p>
                  <p>Enedis: {proposal.enedisShare}%</p>
                  <p>Joul: {proposal.joulShare}%</p>
                  <p>Pool: {proposal.poolShare}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <p className="text-white text-sm">Current Status: {getStatusText(workflowStatus)}</p>
          
          {workflowStatus === 2 && (
            <button
              onClick={startVotingSession}
              className="px-4 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
            >
              Start New Voting Session
            </button>
          )}

          {workflowStatus === 0 && (
            <button
              onClick={endVotingSession}
              className="px-4 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
            >
              End Voting Session
            </button>
          )}

          {workflowStatus === 1 && (
            <button
              onClick={tallyVotes}
              className="px-4 py-1 bg-[#18ad65] text-white text-xs rounded hover:bg-[#18ad65]/80"
            >
              Tally Votes
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-2">
        <h3 className="text-sm font-bold text-white mb-1">Voting Information</h3>
        <div className="space-y-1 text-xs">
          <p className="text-white">Required JOUL tokens to vote: {formatEther(VOTE_COST)} JOUL</p>
          <p className="text-gray-400">Note: JOUL tokens used for voting will be burned</p>
        </div>
      </div>
    </div>
  );
}
