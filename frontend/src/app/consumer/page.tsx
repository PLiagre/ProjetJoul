'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect } from 'react'

interface ConsumerStats {
  totalPurchases: string
  activeOrders: number
  joulBalance: string
  maticBalance: string
}

interface EnergyOffer {
  id: string
  producer: string
  quantity: number
  pricePerUnit: string
  energyType: string
  timestamp: number
}

interface PurchaseHistory {
  id: string
  quantity: number
  price: string
  producer: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
  nftId?: string
}

export default function ConsumerDashboard() {
  const { isConnected, address } = useAccount()
  const [stats, setStats] = useState<ConsumerStats>({
    totalPurchases: '0',
    activeOrders: 0,
    joulBalance: '0',
    maticBalance: '0'
  })
  const [availableOffers, setAvailableOffers] = useState<EnergyOffer[]>([])
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([])

  // TODO: Implémenter la récupération des données depuis les contrats
  useEffect(() => {
    if (!isConnected) return

    // Placeholder data
    setStats({
      totalPurchases: '2,345 MATIC',
      activeOrders: 2,
      joulBalance: '250 JOUL',
      maticBalance: '5.5 MATIC'
    })

    setAvailableOffers([
      {
        id: '1',
        producer: '0x1234...5678',
        quantity: 1000,
        pricePerUnit: '0.001',
        energyType: 'Solaire',
        timestamp: Date.now()
      }
    ])

    setPurchaseHistory([
      {
        id: '1',
        quantity: 1000,
        price: '1 MATIC',
        producer: '0x1234...5678',
        timestamp: Date.now(),
        status: 'completed',
        nftId: '1'
      }
    ])
  }, [isConnected])

  const handlePurchase = async (offerId: string) => {
    // TODO: Implémenter l'achat d'énergie
    console.log('Purchasing offer:', offerId)
  }

  if (!isConnected) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-8">Espace Acheteur</h1>
            <ConnectButton label="Connecter son wallet" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Tableau de bord Acheteur</h1>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Achats Totaux</div>
          <div className="stat-value">{stats.totalPurchases}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Commandes Actives</div>
          <div className="stat-value">{stats.activeOrders}</div>
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

      {/* Available Offers */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Offres Disponibles</h2>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producteur</th>
                <th>Quantité (Wh)</th>
                <th>Prix/unité</th>
                <th>Type</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableOffers.map((offer) => (
                <tr key={offer.id}>
                  <td>{offer.id}</td>
                  <td>{offer.producer}</td>
                  <td>{offer.quantity}</td>
                  <td>{offer.pricePerUnit} MATIC</td>
                  <td>{offer.energyType}</td>
                  <td>{new Date(offer.timestamp).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePurchase(offer.id)}
                    >
                      Acheter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Purchase History */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Historique des Achats</h2>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Quantité</th>
                <th>Prix</th>
                <th>Producteur</th>
                <th>Date</th>
                <th>Statut</th>
                <th>NFT</th>
              </tr>
            </thead>
            <tbody>
              {purchaseHistory.map((purchase) => (
                <tr key={purchase.id}>
                  <td>{purchase.id}</td>
                  <td>{purchase.quantity} Wh</td>
                  <td>{purchase.price}</td>
                  <td>{purchase.producer}</td>
                  <td>{new Date(purchase.timestamp).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      purchase.status === 'completed' ? 'badge-success' :
                      purchase.status === 'pending' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                  <td>
                    {purchase.nftId && (
                      <a 
                        href={`https://mumbai.polygonscan.com/token/${purchase.nftId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        Voir NFT
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Energy Certificates */}
      <section className="bg-base-200 rounded-box p-6">
        <h2 className="text-2xl font-bold mb-4">Vos Certificats d'Énergie</h2>
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">Information</h3>
            <div className="text-sm">
              Chaque achat d'énergie validé génère automatiquement un NFT certifiant votre acquisition d'énergie verte.
              Ces certificats sont la preuve de votre contribution à la transition énergétique.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
