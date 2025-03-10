import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat, polygon } from 'wagmi/chains'
import { http } from 'wagmi'
import contractAddresses from './contract-addresses.json'
import contractAddressesAmoy from './contract-addresses-amoy.json'
import { Chain } from 'wagmi/chains'

// Configuration de Polygon Amoy
export const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'POL',
    symbol: 'POL',
  },
  rpcUrls: {
    public: { 
      http: [
        'https://rpc-amoy.polygon.technology',
        'https://polygon-amoy.blockpi.network/v1/rpc/public',
        'https://polygon-amoy.public.blastapi.io'
      ] 
    },
    default: { 
      http: [
        'https://rpc-amoy.polygon.technology',
        'https://polygon-amoy.blockpi.network/v1/rpc/public',
        'https://polygon-amoy.public.blastapi.io'
      ] 
    },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const satisfies Chain

export const wagmiConfig = getDefaultConfig({
  appName: 'JOUL Energy Exchange',
  projectId: 'c6c9e3de6f50a53b26b9b9c4859d6025', // WalletConnect Project ID
  chains: [polygon, polygonAmoy, hardhat, sepolia],
  ssr: true, // Enable server-side rendering support
  transports: {
    [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0], {
      batch: false,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 20000
    }),
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http('https://rpc.sepolia.org'),
    [polygon.id]: http('https://polygon-rpc.com', {
      batch: false,
      retryCount: 3,
      retryDelay: 3000, // 3 seconds between retries
      timeout: 20000    // 20 second timeout
    })
  }
})

// Fonction pour obtenir les adresses de contrat en fonction du réseau
export function getContractAddresses(chainId: number) {
  // Si on est sur Polygon Amoy (chainId: 80002)
  if (chainId === polygonAmoy.id) {
    return contractAddressesAmoy;
  }
  
  // Si on est sur Polygon Mainnet (chainId: 137)
  if (chainId === polygon.id) {
    return contractAddresses;
  }
  
  // Par défaut, utiliser les adresses locales
  return contractAddresses;
}

// Contract addresses from our latest deployment
export const CONTRACT_ADDRESSES = getContractAddresses(polygon.id)
