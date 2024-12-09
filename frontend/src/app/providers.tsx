"use client";

import { WagmiConfig } from 'wagmi'
import { wagmiConfig } from '../lib/wagmi-config'
import { EnergyExchangeProvider } from '../contexts/energy-exchange-provider'
import { UserManagementProvider } from '../contexts/user-management-provider'
import { Toaster } from '../components/ui/toaster'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client
const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <UserManagementProvider>
          <EnergyExchangeProvider>
            {children}
            <Toaster />
          </EnergyExchangeProvider>
        </UserManagementProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
