import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi';
import { getAddress, abi } from '../contracts/joul-token';
import { parseEther } from 'viem';

export function useJoulToken() {
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

  const approve = async (spender: `0x${string}`, amount: number) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    const hash = await writeContractAsync({
      address: contractAddress,
      abi,
      functionName: 'approve',
      args: [spender, parseEther(amount.toString())],
    });

    return hash;
  };

  return {
    balance,
    approve,
  };
}
