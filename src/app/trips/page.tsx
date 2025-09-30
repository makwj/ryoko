"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User } from "@supabase/supabase-js";
import { Home, MapPin, Users, Bookmark } from "lucide-react";
import CreateTripModal from "@/components/CreateTripModal";
import Image from "next/image";
import { motion } from "framer-motion";

export default function TripsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleTripCreated = () => {
    // Toast message is handled in CreateTripModal component
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header - floating frosted glass navbar */}
        <motion.header
          className="fixed top-4 inset-x-0 z-30 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-[1200px] px-3">
            <motion.div
              className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md shadow-lg shadow-black/5 flex items-center justify-between"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Image src="/assets/ryokolong.png" alt="Ryoko logo" width={120} height={40} />
              </motion.div>
              <motion.nav
                className="flex items-center gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button className="p-2 text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors">
                  <MapPin className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/social')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/bookmark')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </motion.nav>
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-dark-medium text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </motion.div>
            </motion.div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-dark mb-4">Trips</h1>
            <p className="text-gray-600 mb-8">Manage and view all your trips here.</p>
            <button 
              onClick={() => setShowCreateTripModal(true)}
              className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create New Trip
            </button>
          </div>
        </main>

        {/* Create Trip Modal */}
        <CreateTripModal
          open={showCreateTripModal}
          onClose={() => setShowCreateTripModal(false)}
          onTripCreated={handleTripCreated}
        />
      </div>
    </ProtectedRoute>
  );
}
