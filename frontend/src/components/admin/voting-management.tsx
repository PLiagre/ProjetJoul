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
    if (workflowStatus >= 2) {
      Promise.all(proposals.map((_, index) => getProposalVoteCount(index)))
        .then(setVoteCounts)
        .catch(console.error);
    }
  }, [workflowStatus, getProposalVoteCount, proposals]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return 'Registering Voters';
      case 1:
        return 'Voting Session Active';
      case 2:
        return 'Voting Session Ended';
      case 3:
        return 'Votes Tallied';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Voting Management</h2>
      
      <div className="mb-6 space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-xl font-bold text-white mb-4">Distribution Proposals</h3>
          <div className="grid gap-4">
            {proposals.map((proposal, index) => (
              <div key={index} className={`p-3 rounded-lg ${winningProposalId !== null && Number(winningProposalId) === index ? 'bg-blue-900' : 'bg-gray-600'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Proposal {index + 1}</span>
                  {voteCounts[index] !== undefined && (
                    <span className="text-gray-300">Votes: {voteCounts[index].toString()}</span>
                  )}
                  {winningProposalId !== null && Number(winningProposalId) === index && (
                    <span className="text-green-400 font-bold">Winner</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-white">
                  <p>Producer: {proposal.producerShare}%</p>
                  <p>Enedis: {proposal.enedisShare}%</p>
                  <p>Joul: {proposal.joulShare}%</p>
                  <p>Pool: {proposal.poolShare}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white mb-2">Current Status: {getStatusText(workflowStatus)}</p>
        
        <div className="space-y-4">
          {workflowStatus === 0 && (
            <button
              onClick={startVotingSession}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Start Voting Session
            </button>
          )}

          {workflowStatus === 1 && (
            <button
              onClick={endVotingSession}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              End Voting Session
            </button>
          )}

          {workflowStatus === 2 && (
            <button
              onClick={tallyVotes}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tally Votes
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-xl font-bold text-white mb-2">Voting Information</h3>
        <div className="space-y-2 text-white">
          <p>Required JOUL tokens to vote: {formatEther(VOTE_COST)} JOUL</p>
          <p className="text-sm text-gray-400">Note: JOUL tokens used for voting will be burned</p>
        </div>
      </div>
    </div>
  );
}
