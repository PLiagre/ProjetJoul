import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { Chain } from 'wagmi/chains'
import { http } from 'wagmi'

// Configuration de Polygon Amoy Testnet
export const polygonAmoy = {
  id: 80_001,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology'] },
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const satisfies Chain

export const wagmiConfig = getDefaultConfig({
  appName: 'JOUL Energy Exchange',
  projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID', // À remplacer par votre Project ID WalletConnect
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http()
  },
})

// Adresses des contrats déployés sur Polygon Amoy
export const CONTRACT_ADDRESSES = {
  JOUL_TOKEN: '0x...',      // À remplacer après déploiement
  ENERGY_NFT: '0x...',      // À remplacer après déploiement
  ENERGY_EXCHANGE: '0x...', // À remplacer après déploiement
  JOUL_GOVERNANCE: '0x...'  // À remplacer après déploiement
} as const
