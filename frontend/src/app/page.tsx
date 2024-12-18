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
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-bold mb-4">Welcome to Joul Energy Exchange</h2>
            <p className="text-gray-400 mb-8">Please connect your wallet to continue</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {userRole === 'admin' && <AdminDashboard />}
            {userRole === 'producer' && <ProducerDashboard />}
            {userRole === 'consumer' && <ConsumerDashboard />}
            {!userRole && (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
                <p className="text-gray-400 mb-8">You don't have the required role to access this platform.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
