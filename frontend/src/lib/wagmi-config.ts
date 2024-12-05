import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { polygonMumbai } from 'viem/chains'
import { http } from 'viem'

export const wagmiConfig = getDefaultConfig({
  appName: 'JOUL Energy Exchange',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [polygonMumbai],
  transports: {
    [polygonMumbai.id]: http()
  },
})

export const MUMBAI_RPC_URL = 'https://rpc-mumbai.maticvigil.com'
