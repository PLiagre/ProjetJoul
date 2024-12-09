import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat } from 'wagmi/chains'
import { http } from 'wagmi'

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
  JOUL_TOKEN: '0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB',
  ENERGY_NFT: '0x9E545E3C0baAB3E08CdfD552C960A1050f373042',
  USER_MANAGEMENT: '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
  ENERGY_EXCHANGE: '0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8',
  JOUL_GOVERNANCE: '0x851356ae760d987E095750cCeb3bC6014560891C'
} as const
