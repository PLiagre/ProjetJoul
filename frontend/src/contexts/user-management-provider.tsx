"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useUserManagementContract } from "../contracts/user-management";
import { ADMIN_ROLE, PRODUCER_ROLE, CONSUMER_ROLE } from "../contracts/user-management";
import { useToast } from "../components/ui/use-toast";

interface UserManagementContextType {
  addUser: (address: string, isProducer: boolean) => Promise<void>;
  isAddingUser: boolean;
  isProducer: (address: string) => Promise<boolean>;
  isConsumer: (address: string) => Promise<boolean>;
  isAdmin: (address: string) => Promise<boolean>;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

// Helper function to ensure address is properly formatted
function validateAndFormatAddress(address: string): `0x${string}` {
  const normalizedAddress = address.toLowerCase();
  if (!normalizedAddress.startsWith('0x') || normalizedAddress.length !== 42) {
    throw new Error('Invalid Ethereum address format');
  }
  return normalizedAddress as `0x${string}`;
}

// Helper function to ensure role is properly formatted
function validateAndFormatRole(role: string): `0x${string}` {
  if (!role.startsWith('0x')) {
    throw new Error('Invalid role format');
  }
  return role as `0x${string}`;
}

export function UserManagementProvider({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const { address } = useAccount();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const contract = useUserManagementContract();
  const publicClient = usePublicClient();
  const { toast } = useToast();

  const isProducer = useCallback(async (userAddress: string): Promise<boolean> => {
    if (!publicClient || !contract.address) return false;
    try {
      const formattedAddress = validateAndFormatAddress(userAddress);
      const formattedRole = validateAndFormatRole(PRODUCER_ROLE);
      const data = await publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'hasRole',
        args: [formattedRole, formattedAddress],
      });
      console.log('isProducer check result:', data);
      return data as boolean;
    } catch (error) {
      console.error("Failed to check producer status:", error);
      return false;
    }
  }, [publicClient, contract]);

  const isConsumer = useCallback(async (userAddress: string): Promise<boolean> => {
    if (!publicClient || !contract.address) return false;
    try {
      const formattedAddress = validateAndFormatAddress(userAddress);
      const formattedRole = validateAndFormatRole(CONSUMER_ROLE);
      const data = await publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'hasRole',
        args: [formattedRole, formattedAddress],
      });
      console.log('isConsumer check result:', data);
      return data as boolean;
    } catch (error) {
      console.error("Failed to check consumer status:", error);
      return false;
    }
  }, [publicClient, contract]);

  const isAdmin = useCallback(async (userAddress: string): Promise<boolean> => {
    if (!publicClient || !contract.address) return false;
    try {
      const formattedAddress = validateAndFormatAddress(userAddress);
      const formattedRole = validateAndFormatRole(ADMIN_ROLE);
      const data = await publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'hasRole',
        args: [formattedRole, formattedAddress],
      });
      console.log('isAdmin check result:', data);
      return data as boolean;
    } catch (error) {
      console.error("Failed to check admin status:", error);
      return false;
    }
  }, [publicClient, contract]);

  const checkUserRoles = useCallback(async (userAddress: string): Promise<boolean> => {
    console.log('Checking roles for address:', userAddress);
    
    // Vérifier si l'utilisateur est admin
    const hasAdminRole = await isAdmin(userAddress);
    console.log('Has admin role:', hasAdminRole);
    if (hasAdminRole) {
      toast({
        title: "Failed to Add User",
        description: "Cette adresse est un administrateur et ne peut pas avoir de rôle supplémentaire.",
        variant: "destructive",
      });
      return true;
    }

    // Vérifier si l'utilisateur a déjà un rôle
    const [hasProducerRole, hasConsumerRole] = await Promise.all([
      isProducer(userAddress),
      isConsumer(userAddress)
    ]);
    console.log('Has producer role:', hasProducerRole);
    console.log('Has consumer role:', hasConsumerRole);

    if (hasProducerRole || hasConsumerRole) {
      toast({
        title: "Failed to Add User",
        description: "Cette adresse a déjà un rôle attribué (producteur ou consommateur).",
        variant: "destructive",
      });
      return true;
    }

    return false;
  }, [isAdmin, isProducer, isConsumer, toast]);

  const addUser = useCallback(async (userAddress: string, isProducerRole: boolean) => {
    if (!address) return;
    
    try {
      setIsAddingUser(true);
      const formattedAddress = validateAndFormatAddress(userAddress);

      // Vérifier les rôles avant de procéder
      console.log('Starting role checks...');
      const hasExistingRole = await checkUserRoles(formattedAddress);
      console.log('Role check result:', hasExistingRole);

      if (hasExistingRole) {
        console.log('User has existing role, stopping execution');
        setIsAddingUser(false);
        return;
      }

      console.log('No existing roles found, proceeding with addition');
      toast({
        title: "Adding User",
        description: "Please wait while the user is being added...",
      });

      await writeContractAsync({
        ...contract,
        functionName: 'addUser',
        args: [formattedAddress, isProducerRole],
      });

      // Wait for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "User Added",
        description: `Successfully added user as ${isProducerRole ? 'producer' : 'consumer'}.`,
      });
    } catch (error: any) {
      console.error("Failed to add user:", error);
      toast({
        title: "Failed to Add User",
        description: "Une erreur est survenue lors de l'ajout de l'utilisateur.",
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  }, [address, writeContractAsync, contract, toast, checkUserRoles]);

  return (
    <UserManagementContext.Provider
      value={{
        addUser,
        isAddingUser,
        isProducer,
        isConsumer,
        isAdmin,
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
