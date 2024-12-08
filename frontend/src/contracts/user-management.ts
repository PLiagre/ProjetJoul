import { useContractRead, useContractWrite } from 'wagmi'
import { type Config } from 'wagmi'

const abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isProducer",
        "type": "bool"
      }
    ],
    "name": "addUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isProducer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isConsumer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

type UserManagementContract = {
  addUser: (params: { args: readonly [string, boolean] }) => void
  isProducer: boolean | undefined
  isConsumer: boolean | undefined
}

export function useUserManagement(contractAddress: string): UserManagementContract {
  const { writeAsync } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'addUser',
  } as const)

  const { data: isProducerData } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'isProducer',
  } as const)

  const { data: isConsumerData } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'isConsumer',
  } as const)

  return {
    addUser: writeAsync,
    isProducer: isProducerData as boolean | undefined,
    isConsumer: isConsumerData as boolean | undefined,
  }
}
