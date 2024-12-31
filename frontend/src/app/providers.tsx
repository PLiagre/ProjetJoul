"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../lib/wagmi-config'
import { EnergyExchangeProvider } from '../contexts/energy-exchange-provider'
import { UserManagementProvider } from '../contexts/user-management-provider'
import { VotingProvider } from '../contexts/voting-provider'
import { Toaster } from '../components/ui/toaster'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'

// Create a client
const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#2E3F6C',
          accentColorForeground: 'white',
          borderRadius: 'small',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          <UserManagementProvider>
            <VotingProvider>
              <EnergyExchangeProvider>
                {children}
                <Toaster />
              </EnergyExchangeProvider>
            </VotingProvider>
          </UserManagementProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
