'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect } from 'react'

interface ProducerStats {
  totalEnergy: number
  activeOffers: number
  totalSales: string
  joulBalance: string
  maticBalance: string
}

interface NFTCertificate {
  id: string
  quantity: number
  energyType: string
  timestamp: number
  uri: string
}

interface SaleHistory {
  id: string
  quantity: number
  price: string
  buyer: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
}

export default function ProducerDashboard() {
  const { isConnected, address } = useAccount()
  const [stats, setStats] = useState<ProducerStats>({
    totalEnergy: 0,
    activeOffers: 0,
    totalSales: '0',
    joulBalance: '0',
    maticBalance: '0'
  })
  const [nfts, setNfts] = useState<NFTCertificate[]>([])
  const [saleHistory, setSaleHistory] = useState<SaleHistory[]>([])
  const [newOffer, setNewOffer] = useState({
    quantity: '',
    pricePerUnit: '',
    energyType: 'Solaire'
  })

  // TODO: Implémenter la récupération des données depuis les contrats
  useEffect(() => {
    if (!isConnected) return

    // Placeholder data
    setStats({
      totalEnergy: 5000,
      activeOffers: 3,
      totalSales: '1,234 MATIC',
      joulBalance: '500 JOUL',
      maticBalance: '10.5 MATIC'
    })

    setNfts([
      {
        id: '1',
        quantity: 1000,
        energyType: 'Solaire',
        timestamp: Date.now(),
        uri: 'ipfs://...'
      }
    ])

    setSaleHistory([
      {
        id: '1',
        quantity: 1000,
        price: '1.5 MATIC',
        buyer: '0x1234...5678',
        timestamp: Date.now(),
        status: 'completed'
      }
    ])
  }, [isConnected])

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implémenter la création d'offre
    console.log('Creating offer:', newOffer)
  }

  if (!isConnected) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-8">Espace Producteur</h1>
            <ConnectButton label="Connecter son wallet" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Tableau de bord Producteur</h1>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Énergie Totale</div>
          <div className="stat-value">{stats.totalEnergy} Wh</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Offres Actives</div>
          <div className="stat-value">{stats.activeOffers}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Ventes Totales</div>
          <div className="stat-value">{stats.totalSales}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Balance JOUL</div>
          <div className="stat-value">{stats.joulBalance}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Balance MATIC</div>
          <div className="stat-value">{stats.maticBalance}</div>
        </div>
      </section>

      {/* Create Offer Form */}
      <section className="bg-base-200 rounded-box p-6">
        <h2 className="text-2xl font-bold mb-4">Créer une offre</h2>
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Quantité (Wh)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={newOffer.quantity}
                onChange={(e) => setNewOffer({...newOffer, quantity: e.target.value})}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Prix par unité (MATIC)</span>
              </label>
              <input
                type="number"
                step="0.000001"
                className="input input-bordered"
                value={newOffer.pricePerUnit}
                onChange={(e) => setNewOffer({...newOffer, pricePerUnit: e.target.value})}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Type d'énergie</span>
              </label>
              <select
                className="select select-bordered"
                value={newOffer.energyType}
                onChange={(e) => setNewOffer({...newOffer, energyType: e.target.value})}
              >
                <option>Solaire</option>
                <option>Éolien</option>
                <option>Hydraulique</option>
                <option>Biomasse</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Créer l'offre
          </button>
        </form>
      </section>

      {/* NFT Certificates */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Certificats NFT</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nfts.map((nft) => (
            <div key={nft.id} className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">Certificat #{nft.id}</h3>
                <p>Quantité: {nft.quantity} Wh</p>
                <p>Type: {nft.energyType}</p>
                <p>Date: {new Date(nft.timestamp).toLocaleDateString()}</p>
                <div className="card-actions justify-end">
                  <a 
                    href={`https://mumbai.polygonscan.com/token/${nft.uri}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    Voir sur Polygonscan
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sale History */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Historique des ventes</h2>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Quantité</th>
                <th>Prix</th>
                <th>Acheteur</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {saleHistory.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{sale.quantity} Wh</td>
                  <td>{sale.price}</td>
                  <td>{sale.buyer}</td>
                  <td>{new Date(sale.timestamp).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      sale.status === 'completed' ? 'badge-success' :
                      sale.status === 'pending' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
