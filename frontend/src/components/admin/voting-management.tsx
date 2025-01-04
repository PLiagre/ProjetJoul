import React, { useState } from 'react';
import { useVoting } from '../../contexts/voting-provider';
import { formatEther } from 'viem';
import { VOTE_COST } from '../../contracts/joul-voting';
import { useToast } from '../../components/ui/use-toast';

export function VotingManagement() {
  const { 
    workflowStatus, 
    startVotingSession, 
    endVotingSession, 
    tallyVotes, 
    winningDistribution,
    getProposalVoteCount,
    winningProposalId,
    proposals,
    refreshState
  } = useVoting();

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [voteCounts, setVoteCounts] = React.useState<bigint[]>([]);

  // Récupération des décomptes de votes avec un intervalle plus long
  React.useEffect(() => {
    let isMounted = true;
    const fetchVotes = async () => {
      if (!isMounted) return;
      
      try {
        const counts = await Promise.all(
          proposals.map((_, index) => getProposalVoteCount(index))
        );
        if (isMounted) {
          setVoteCounts(counts);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des décomptes de votes:', error);
      }
    };

    fetchVotes();

    // Mise à jour des votes toutes les 30 secondes pendant le vote actif
    let interval: NodeJS.Timeout;
    if (workflowStatus === 0) { // Session de vote active
      interval = setInterval(fetchVotes, 30000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [workflowStatus, getProposalVoteCount, proposals]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return 'Session de Vote Active';
      case 1:
        return 'Session de Vote Terminée';
      case 2:
        return 'Votes Comptabilisés';
      default:
        return 'Statut Inconnu';
    }
  };

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await action();
      await refreshState();
      toast({
        title: "Succès",
        description: successMessage,
      });
    } catch (error: any) {
      console.error('Action error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-xl font-bold mb-1.5 text-white">Gestion des Votes</h2>
      
      <div className="mb-3 space-y-1.5">
        <div className="bg-gray-700 rounded-lg p-2">
          <h3 className="text-sm font-bold text-white mb-1">Propositions de Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {proposals.map((proposal, index) => (
              <div key={index} className="bg-[#225577] rounded-lg p-2">
                <div className="text-center mb-1">
                  <span className="text-white text-xs font-bold">Proposition {index + 1}</span>
                  {voteCounts[index] !== undefined && (
                    <div className="text-gray-300 text-xs">Votes : {voteCounts[index].toString()}</div>
                  )}
                  {winningProposalId !== null && Number(winningProposalId) === index && (
                    <div className="text-green-400 text-xs font-bold">Gagnant</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-white text-xs">
                  <p>Producteur : {proposal.producerShare}%</p>
                  <p>Enedis : {proposal.enedisShare}%</p>
                  <p>Joul : {proposal.joulShare}%</p>
                  <p>Pool : {proposal.poolShare}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <p className="text-white text-sm">Statut Actuel : {getStatusText(workflowStatus)}</p>
          
          {workflowStatus === 2 && (
            <button
              onClick={() => handleAction(startVotingSession, "Nouvelle session de vote démarrée")}
              disabled={isLoading}
              className={`px-4 py-1 bg-[#18ad65] text-white text-xs rounded transition-all ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#18ad65]/80'
              }`}
            >
              {isLoading ? 'Démarrage...' : 'Démarrer une Nouvelle Session de Vote'}
            </button>
          )}

          {workflowStatus === 0 && (
            <button
              onClick={() => handleAction(endVotingSession, "Session de vote terminée")}
              disabled={isLoading}
              className={`px-4 py-1 bg-[#18ad65] text-white text-xs rounded transition-all ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#18ad65]/80'
              }`}
            >
              {isLoading ? 'Terminaison...' : 'Terminer la Session de Vote'}
            </button>
          )}

          {workflowStatus === 1 && (
            <button
              onClick={() => handleAction(tallyVotes, "Votes comptabilisés")}
              disabled={isLoading}
              className={`px-4 py-1 bg-[#18ad65] text-white text-xs rounded transition-all ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#18ad65]/80'
              }`}
            >
              {isLoading ? 'Comptabilisation...' : 'Comptabiliser les Votes'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-2">
        <h3 className="text-sm font-bold text-white mb-1">Informations sur le Vote</h3>
        <div className="space-y-1 text-xs">
          <p className="text-white">Jetons JOUL requis pour voter : {formatEther(VOTE_COST)} JOUL</p>
          <p className="text-gray-400">Note : Les jetons JOUL utilisés pour voter seront brûlés</p>
        </div>
      </div>
    </div>
  );
}
