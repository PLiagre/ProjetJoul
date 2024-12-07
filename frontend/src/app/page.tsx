'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect } from 'react'

interface MarketStats {
  tvl: string
  volume24h: string
  activeOffers: number
  joulPrice: string
}

interface EnergyOffer {
  id: string
  producer: string
  quantity: number
  pricePerUnit: string
  energyType: string
  timestamp: number
}

export default function Home() {
  const { isConnected } = useAccount()
  const [stats, setStats] = useState<MarketStats>({
    tvl: '0',
    volume24h: '0',
    activeOffers: 0,
    joulPrice: '0'
  })
  const [offers, setOffers] = useState<EnergyOffer[]>([])

  // TODO: Implémenter la récupération des stats et offres depuis les contrats
  useEffect(() => {
    // Placeholder data
    setStats({
      tvl: '1,234,567 MATIC',
      volume24h: '123,456 MATIC',
      activeOffers: 42,
      joulPrice: '0.1 MATIC'
    })

    setOffers([
      {
        id: '1',
        producer: '0x1234...5678',
        quantity: 1000,
        pricePerUnit: '0.001',
        energyType: 'Solaire',
        timestamp: Date.now()
      },
      // Plus d'offres...
    ])
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="hero bg-base-200 rounded-box p-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-8">JOUL Energy Exchange</h1>
            <p className="text-xl mb-8">
              Plateforme décentralisée d'échange d'énergie verte
            </p>
            {!isConnected && (
              <ConnectButton label="Connecter son wallet" />
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">TVL</div>
          <div className="stat-value">{stats.tvl}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Volume 24h</div>
          <div className="stat-value">{stats.volume24h}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Offres actives</div>
          <div className="stat-value">{stats.activeOffers}</div>
        </div>
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Prix JOUL</div>
          <div className="stat-value">{stats.joulPrice}</div>
        </div>
      </section>

      {/* Active Offers Section */}
      <section className="space-y-4">
        <h2 className="text-3xl font-bold">Offres actives</h2>
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
              {offers.map((offer) => (
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
                      onClick={() => {/* TODO: Implement purchase */}}
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

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title">Pour les Producteurs</h3>
            <p>Vendez votre surplus d'énergie verte et gagnez des tokens JOUL</p>
            <div className="card-actions justify-end">
              <a href="/producer" className="btn btn-primary">Espace Producteur</a>
            </div>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title">Pour les Acheteurs</h3>
            <p>Achetez de l'énergie verte locale et recevez des NFTs de certification</p>
            <div className="card-actions justify-end">
              <a href="/consumer" className="btn btn-primary">Espace Acheteur</a>
            </div>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title">Gouvernance</h3>
            <p>Participez aux décisions avec vos tokens JOUL</p>
            <div className="card-actions justify-end">
              <a href="/governance" className="btn btn-primary">Espace Gouvernance</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
