"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useAccount, useContractRead } from "wagmi";
import { useUserManagement } from "../contracts/user-management";

interface UserManagementContextType {
  addUser: (address: string, isProducer: boolean) => Promise<void>;
  isAddingUser: boolean;
  isProducer: (address: string) => Promise<boolean>;
  isConsumer: (address: string) => Promise<boolean>;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

export function UserManagementProvider({ 
  children,
  contractAddress 
}: { 
  children: React.ReactNode;
  contractAddress: string;
}) {
  const { address } = useAccount();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { addUser: contractAddUser, isProducer: contractIsProducer, isConsumer: contractIsConsumer } = useUserManagement(contractAddress);

  const addUser = useCallback(async (userAddress: string, isProducer: boolean) => {
    if (!address) return;
    setIsAddingUser(true);
    try {
      await contractAddUser({
        abi,
        address: contractAddress as `0x${string}`,
        functionName: 'addUser',
        args: [userAddress as `0x${string}`, isProducer],
      });
    } catch (error) {
      console.error("Failed to add user:", error);
      throw error;
    } finally {
      setIsAddingUser(false);
    }
  }, [address, contractAddUser, contractAddress]);

  const isProducer = useCallback(async (userAddress: string): Promise<boolean> => {
    try {
      const result = await contractIsProducer(userAddress as `0x${string}`);
      return result || false;
    } catch (error) {
      console.error("Failed to check producer status:", error);
      return false;
    }
  }, [contractIsProducer]);

  const isConsumer = useCallback(async (userAddress: string): Promise<boolean> => {
    try {
      const result = await contractIsConsumer(userAddress as `0x${string}`);
      return result || false;
    } catch (error) {
      console.error("Failed to check consumer status:", error);
      return false;
    }
  }, [contractIsConsumer]);

  return (
    <UserManagementContext.Provider
      value={{
        addUser,
        isAddingUser,
        isProducer,
        isConsumer,
      }}
    >
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagementContext() {
  const context = useContext(UserManagementContext);
  if (context === undefined) {
    throw new Error("useUserManagementContext must be used within a UserManagementProvider");
  }
  return context;
}

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
] as const;
