import contractAddresses from '../lib/contract-addresses.json'

export function useContractAddresses() {
  return {
    joulToken: contractAddresses.JOUL_TOKEN as `0x${string}`,
    energyNFT: contractAddresses.ENERGY_NFT as `0x${string}`,
    userManagement: contractAddresses.USER_MANAGEMENT as `0x${string}`,
    energyExchange: contractAddresses.ENERGY_EXCHANGE as `0x${string}`,
    joulGovernance: contractAddresses.JOUL_GOVERNANCE as `0x${string}`,
  }
}
