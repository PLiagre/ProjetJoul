import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'
import { http } from 'wagmi'

export const wagmiConfig = getDefaultConfig({
  appName: 'JOUL Energy Exchange',
  projectId: 'c6c9e3de6f50a53b26b9b9c4859d6025', // WalletConnect Project ID
  chains: [sepolia],
  transports: {
    [sepolia.id]: http()
  },
})

// Adresses des contrats déployés sur Sepolia
export const CONTRACT_ADDRESSES = {
  JOUL_TOKEN: '0x4d2dbdD0727edF6346c8207927B362cB334dEf6a',
  ENERGY_NFT: '0x326f559aA170D323dBb17b6308638043A07b60BA',
  ENERGY_EXCHANGE: '0x3e5A0693d4dE500EcA89a97F565626969243D4E4',
  JOUL_GOVERNANCE: '0x9249A6b1e5909a4136b885bf0e65636e94C69857'
} as const
