import React from 'react';
import { useVoting } from '../../contexts/voting-provider';

export function VotingManagement() {
  const { workflowStatus, startVotingSession, endVotingSession, tallyVotes, winningDistribution } = useVoting();

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
      
      <div className="mb-6">
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

      {winningDistribution && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-xl font-bold text-white mb-2">Winning Distribution</h3>
          <div className="space-y-2 text-white">
            <p>Producer: {winningDistribution.producerShare}%</p>
            <p>Enedis: {winningDistribution.enedisShare}%</p>
            <p>Joul: {winningDistribution.joulShare}%</p>
            <p>Pool: {winningDistribution.poolShare}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
