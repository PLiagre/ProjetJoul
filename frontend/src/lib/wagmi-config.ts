import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat } from 'wagmi/chains'
import { http } from 'wagmi'
import contractAddresses from './contract-addresses.json'

export const wagmiConfig = getDefaultConfig({
  appName: 'JOUL Energy Exchange',
  projectId: 'c6c9e3de6f50a53b26b9b9c4859d6025', // WalletConnect Project ID
  chains: [hardhat, sepolia],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http()
  },
})

// Contract addresses from our latest deployment
export const CONTRACT_ADDRESSES = {
  JOUL_TOKEN: contractAddresses.JOUL_TOKEN,
  ENERGY_NFT: contractAddresses.ENERGY_NFT,
  USER_MANAGEMENT: contractAddresses.USER_MANAGEMENT,
  ENERGY_EXCHANGE: contractAddresses.ENERGY_EXCHANGE,
  JOUL_GOVERNANCE: contractAddresses.JOUL_GOVERNANCE
} as const
