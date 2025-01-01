import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/energy-nft';

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

  return {
    balance,
    approve,
    transferFrom,
    mintCertificate,
  };
}
