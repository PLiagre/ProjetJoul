"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { AdminDashboard } from "../components/admin/admin-dashboard";
import { ProducerDashboard } from "../components/producer/producer-dashboard";
import { ConsumerDashboard } from "../components/consumer/consumer-dashboard";
import { useUserManagementContext } from "../contexts/user-management-provider";
import Header from "../components/shared/header";

export default function Home() {
  const { isConnected, address } = useAccount();
  const { isAdmin, isProducer, isConsumer } = useUserManagementContext();
  const [userRole, setUserRole] = useState<'admin' | 'producer' | 'consumer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUserRole() {
      if (!address) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        if (await isAdmin(address)) {
          setUserRole('admin');
        } else if (await isProducer(address)) {
          setUserRole('producer');
        } else if (await isConsumer(address)) {
          setUserRole('consumer');
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        setUserRole(null);
      }
      setLoading(false);
    }

    checkUserRole();
  }, [address, isAdmin, isProducer, isConsumer]);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4">
        {!isConnected || loading || !userRole ? (
          <>
            {/* Banner Section - Only show for non-dashboard states */}
            <div className="w-full h-60 relative bg-[#225577]">
              <img 
                src="/images/JoulLogo.png" 
                alt="Joul Banner" 
                className="w-full h-full object-contain object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
            </div>
            <div className="max-w-7xl mx-auto">
              {!isConnected ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh]">
                  <h2 className="text-3xl font-bold mb-4 text-white">Welcome to Joul Energy Exchange</h2>
                  <p className="text-gray-400">Please connect your wallet to continue</p>
                </div>
              ) : loading ? (
                <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-center min-h-[40vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#18ad65]"></div>
                </div>
              ) : !userRole && (
                <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[40vh]">
                  <h2 className="text-3xl font-bold mb-4 text-white">Access Restricted</h2>
                  <p className="text-gray-400 mb-8">You don't have the required role to access this platform.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          // Render dashboard without banner
          <>
            {userRole === 'admin' && <AdminDashboard />}
            {userRole === 'producer' && <ProducerDashboard />}
            {userRole === 'consumer' && <ConsumerDashboard />}
          </>
        )}
      </main>
    </div>
  );
}
