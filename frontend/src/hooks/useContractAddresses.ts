import { useChainId } from 'wagmi'
import contractAddresses from '../lib/contract-addresses.json'
import contractAddressesAmoy from '../lib/contract-addresses-amoy.json'
import { polygonAmoy } from '../lib/wagmi-config'

export function useContractAddresses() {
  const chainId = useChainId()
  
  // Use Amoy addresses if we're on Polygon Amoy network
  const addresses = chainId === polygonAmoy.id ? contractAddressesAmoy : contractAddresses

  return {
    joulToken: addresses.JOUL_TOKEN as `0x${string}`,
    energyNFT: addresses.ENERGY_NFT as `0x${string}`,
    userManagement: addresses.USER_MANAGEMENT as `0x${string}`,
    energyExchange: addresses.ENERGY_EXCHANGE as `0x${string}`,
  }
}
