import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/energy-nft';

interface EnergyData {
  quantity: bigint;
  energyType: string;
  timestamp: bigint;
  producer: string;
}

export function useEnergyNFT() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getAddress(chainId);

  const { data: balance } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'balanceOf',
    args: address && isConnected ? [address] : undefined,
  });

  const { writeContractAsync } = useWriteContract();

  const approve = async (operator: `0x${string}`, approved: boolean) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    const hash = await writeContractAsync({
      address: contractAddress,
      abi,
      functionName: 'setApprovalForAll',
      args: [operator, approved],
    });

    return hash;
  };

  const transferFrom = async (from: `0x${string}`, to: `0x${string}`, tokenId: bigint) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    const hash = await writeContractAsync({
      address: contractAddress,
      abi,
      functionName: 'transferFrom',
      args: [from, to, tokenId],
    });

    return hash;
  };

  const mintCertificate = async (
    to: `0x${string}`,
    quantity: bigint,
    energyType: string,
    uri: string
  ) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    const hash = await writeContractAsync({
      address: contractAddress,
      abi,
      functionName: 'mintCertificate',
      args: [to, quantity, energyType, uri],
    });

    return hash;
  };

  // Fonction pour obtenir l'URL OpenSea d'un NFT
  const getOpenSeaURL = (tokenId: string | number) => {
    // URL de base pour OpenSea testnet (Polygon Amoy)
    const baseURL = "https://testnets.opensea.io/assets/amoy";
    return `${baseURL}/${contractAddress}/${tokenId}`;
  };

  // Fonction pour obtenir l'URL de l'image selon le type d'énergie
  const getEnergyTypeImage = (energyType: string): string => {
    const normalizedType = energyType.toLowerCase();
    const images: { [key: string]: string } = {
      "solaire": "https://ipfs.io/ipfs/QmZNqPN3MNvHbW6gkUB4VH19mnCzDyUe1u933okCNbTgMD",
      "eolien": "https://ipfs.io/ipfs/Qmdvy5wjzKZ3dchsdRWPbZZmRDvHtgkrjBQzxECNfDXBpt",
      "hydraulique": "https://ipfs.io/ipfs/QmY2pjifFR5CQbE25LkGCztq3smM6SW8WQHuSfCiWHEFgP",
      "biomasse": "https://ipfs.io/ipfs/Qmf7iRSjE6zkSeYiVXikosSFiDqHntFcBkEQmwpMVRNsQ6"
    };
    return images[normalizedType] || images["solaire"];
  };

  return {
    balance,
    approve,
    transferFrom,
    mintCertificate,
    getOpenSeaURL,
    getEnergyTypeImage,
    contractAddress,
    abi,
  };
}

export type { EnergyData };
