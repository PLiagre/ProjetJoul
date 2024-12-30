import { getContractAddresses } from '../lib/wagmi-config'

// Fixed distribution proposals matching the contract
export const DISTRIBUTION_PROPOSALS: Distribution[] = [
  { producerShare: 65, enedisShare: 15, joulShare: 10, poolShare: 10 }, // Proposal 1
  { producerShare: 75, enedisShare: 20, joulShare: 3, poolShare: 2 },   // Proposal 2
  { producerShare: 65, enedisShare: 20, joulShare: 5, poolShare: 10 }   // Proposal 3
];

export const VOTE_COST = BigInt("1000000000000000000"); // 1 JOUL token (18 decimals)

export const abi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "voterAddress",
        "type": "address"
      }
    ],
    "name": "VoterRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "enum JoulVoting.WorkflowStatus",
        "name": "previousStatus",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "enum JoulVoting.WorkflowStatus",
        "name": "newStatus",
        "type": "uint8"
      }
    ],
    "name": "WorkflowStatusChange",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "Voted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_joulToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "addVoter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endVotingSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "getProposalVoteCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "getVoter",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "isRegistered",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "hasVoted",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "votedProposalId",
            "type": "uint256"
          }
        ],
        "internalType": "struct JoulVoting.Voter",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWinningDistribution",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "producerShare",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "enedisShare",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "joulShare",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "poolShare",
            "type": "uint8"
          }
        ],
        "internalType": "struct JoulVoting.Distribution",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "setVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startVotingSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tallyVotes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "workflowStatus",
    "outputs": [
      {
        "internalType": "enum JoulVoting.WorkflowStatus",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "proposals",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "producerShare",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "enedisShare",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "joulShare",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "poolShare",
            "type": "uint8"
          }
        ],
        "internalType": "struct JoulVoting.Distribution",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "winningProposalID",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "proposalVoteCounts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "joulToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function getAddress(chainId: number): `0x${string}` {
  return getContractAddresses(chainId).JOUL_VOTING as `0x${string}`;
}

export type Distribution = {
  producerShare: number;
  enedisShare: number;
  joulShare: number;
  poolShare: number;
};

export enum WorkflowStatus {
  RegisteringVoters,
  VotingSessionStarted,
  VotingSessionEnded,
  VotesTallied,
}
