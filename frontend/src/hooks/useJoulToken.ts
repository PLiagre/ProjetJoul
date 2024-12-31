import { useAccount, useReadContract, useWriteContract, useChainId, usePublicClient } from 'wagmi';
import { getAddress, abi } from '../contracts/joul-token';
import { parseEther, formatEther } from 'viem';
import { useEffect } from 'react';

export function useJoulToken() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getAddress(chainId);

  const publicClient = usePublicClient();
  const { data: balance, refetch: refetchBalance } = useReadContract({
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

  useEffect(() => {
    if (!publicClient || !isConnected || !address) return;

    const unwatchRewardMinted = publicClient.watchContractEvent({
      address: contractAddress,
      abi,
      eventName: 'RewardMinted',
      onLogs: (logs) => {
        logs.forEach(log => {
          if (log.args) {
            const { to, amount, rewardType, baseAmount } = log.args;
            console.log('🎉 RewardMinted Event:', {
              to,
              amount: amount ? formatEther(amount) : '0',
              rewardType,
              baseAmount: baseAmount ? formatEther(baseAmount) : '0',
              timestamp: new Date().toISOString()
            });
          }
        });
        console.log('💰 Refreshing balance after mint...');
        refetchBalance();
      },
    });

    const unwatchTransfer = publicClient.watchContractEvent({
      address: contractAddress,
      abi,
      eventName: 'Transfer',
      onLogs: (logs) => {
        const relevantTransfer = logs.some(
          log => log.args.from === address || log.args.to === address
        );
        if (relevantTransfer) {
          logs.forEach(log => {
            if (log.args) {
              console.log('💸 Transfer Event:', {
                from: log.args.from,
                to: log.args.to,
                amount: log.args.value ? formatEther(log.args.value) : '0',
                timestamp: new Date().toISOString()
              });
            }
          });
          console.log('💰 Refreshing balance after transfer...');
          refetchBalance();
        }
      },
    });

    return () => {
      unwatchRewardMinted();
      unwatchTransfer();
    };
  }, [publicClient, isConnected, address, contractAddress, refetchBalance]);

  const formattedBalance = balance ? formatEther(balance) : '0';
  
  console.log('Current JOUL Balance:', formattedBalance);

  return {
    balance: formattedBalance,
    approve,
  };
}
