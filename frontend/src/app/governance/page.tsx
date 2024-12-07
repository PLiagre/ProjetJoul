'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect } from 'react'

interface GovernanceStats {
  totalProposals: number
  activeProposals: number
  joulBalance: string
  votingPower: string
  quorum: string
}

interface Proposal {
  id: string
  title: string
  description: string
  proposer: string
  startTime: number
  endTime: number
  forVotes: string
  againstVotes: string
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed' | 'canceled'
  hasVoted?: boolean
}

export default function GovernanceDashboard() {
  const { isConnected, address } = useAccount()
  const [stats, setStats] = useState<GovernanceStats>({
    totalProposals: 0,
    activeProposals: 0,
    joulBalance: '0',
    votingPower: '0',
    quorum: '51%'
  })
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    targetContract: '',
    callData: ''
  })

  // TODO: Implémenter la récupération des données depuis les contrats
  useEffect(() => {
    if (!isConnected) return

    // Placeholder data
    setStats({
      totalProposals: 10,
      activeProposals: 2,
      joulBalance: '500 JOUL',
      votingPower: '500 votes',
      quorum: '51%'
    })

    setProposals([
      {
        id: '1',
        title: 'Ajustement des frais de plateforme',
        description: 'Proposition de réduire les frais de plateforme de 3% à 2.5%',
        proposer: '0x1234...5678',
        startTime: Date.now(),
        endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
        forVotes: '10000 JOUL',
        againstVotes: '5000 JOUL',
        status: 'active',
        hasVoted: false
      }
    ])
  }, [isConnected])

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implémenter la création de proposition
    console.log('Creating proposal:', newProposal)
  }

  const handleVote = async (proposalId: string, support: boolean) => {
    // TODO: Implémenter le vote
    console.log('Voting on proposal:', proposalId, 'Support:', support)
  }

  if (!isConnected) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-8">Gouvernance JOUL</h1>
            <ConnectButton label="Connecter son wallet" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Gouvernance JOUL</h1>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Total Propositions</div>
          <div className="stat-value">{stats.totalProposals}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Propositions Actives</div>
          <div className="stat-value">{stats.activeProposals}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Balance JOUL</div>
          <div className="stat-value">{stats.joulBalance}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Pouvoir de Vote</div>
          <div className="stat-value">{stats.votingPower}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Quorum</div>
          <div className="stat-value">{stats.quorum}</div>
        </div>
      </section>

      {/* Create Proposal Form */}
      <section className="bg-base-200 rounded-box p-6">
        <h2 className="text-2xl font-bold mb-4">Créer une Proposition</h2>
        <form onSubmit={handleCreateProposal} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Titre</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={newProposal.title}
              onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={newProposal.description}
              onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Contrat Cible</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="0x..."
                value={newProposal.targetContract}
                onChange={(e) => setNewProposal({...newProposal, targetContract: e.target.value})}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Call Data</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="0x..."
                value={newProposal.callData}
                onChange={(e) => setNewProposal({...newProposal, callData: e.target.value})}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Créer la proposition
          </button>
        </form>
      </section>

      {/* Active Proposals */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Propositions Actives</h2>
        <div className="grid grid-cols-1 gap-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">{proposal.title}</h3>
                <p className="text-sm opacity-70">
                  Proposé par: {proposal.proposer}
                </p>
                <p className="my-4">{proposal.description}</p>
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div>
                    <div className="text-sm opacity-70">Pour</div>
                    <div className="text-xl font-bold">{proposal.forVotes}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-70">Contre</div>
                    <div className="text-xl font-bold">{proposal.againstVotes}</div>
                  </div>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={parseInt(proposal.forVotes)} 
                  max={parseInt(proposal.forVotes) + parseInt(proposal.againstVotes)}
                ></progress>
                <div className="flex justify-between items-center mt-4">
                  <div>
                    <span className={`badge ${
                      proposal.status === 'active' ? 'badge-primary' :
                      proposal.status === 'succeeded' ? 'badge-success' :
                      proposal.status === 'defeated' ? 'badge-error' :
                      'badge-ghost'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  {proposal.status === 'active' && !proposal.hasVoted && (
                    <div className="card-actions">
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleVote(proposal.id, true)}
                      >
                        Pour
                      </button>
                      <button 
                        className="btn btn-error btn-sm"
                        onClick={() => handleVote(proposal.id, false)}
                      >
                        Contre
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-sm opacity-70 mt-4">
                  Fin du vote: {new Date(proposal.endTime).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
