"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";
import { Home, MapPin, Users, Bookmark } from "lucide-react";
import CreateTripModal from "@/components/CreateTripModal";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check current user session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/');
        } else if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Check for email verification success
  useEffect(() => {
    // Check both query parameters and hash parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the # and parse
    
    const type = urlParams.get('type') || hashParams.get('type');
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

    if (type === 'signup' && !error) {
      toast.success("Email verification successful! Welcome to your dashboard.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(errorDescription || "Email verification failed. Please try again.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleTripCreated = () => {
    // Refresh trips data or show success message
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
                  className="p-2 text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/trips')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
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
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </motion.div>
            </motion.div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          {/* Active Trips Section */}
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Active Trips</h2>
              <button 
                onClick={() => setShowCreateTripModal(true)}
                className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create New Trip +
              </button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Trip Card 1 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-green-400 to-green-600"></div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#ff5a58]" />
                    <span className="text-sm text-gray-600">Tuscany, Italy</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Journey Through Italy</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>3 Participants</span>
                    <span>Jul 10 - Jul 14, 2025</span>
                  </div>
                </div>
              </div>

              {/* Trip Card 2 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-600"></div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#ff5a58]" />
                    <span className="text-sm text-gray-600">New York City, USA</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">City Lights and Night Life</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>4 Participants</span>
                    <span>Dec 10 - Jul 24, 2025</span>
                  </div>
                </div>
              </div>

              {/* Trip Card 3 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-red-400 to-orange-600"></div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#ff5a58]" />
                    <span className="text-sm text-gray-600">Kyoto, Japan</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Ancient Temples and</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>6 Participants</span>
                    <span>Jul 10 - Jul 14, 2025</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* City Guides Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">City Guides</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* City Guide Cards */}
              {[
                { name: "TOKYO", gradient: "from-blue-400 to-purple-600" },
                { name: "JAKARTA", gradient: "from-green-400 to-blue-600" },
                { name: "NEW YORK CITY", gradient: "from-yellow-400 to-red-600" },
                { name: "BANGKOK", gradient: "from-orange-400 to-pink-600" },
                { name: "KUALA LUMPUR", gradient: "from-purple-400 to-indigo-600" },
                { name: "TUSCANY", gradient: "from-green-400 to-yellow-600" }
              ].map((city, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`h-32 bg-gradient-to-br ${city.gradient}`}></div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-center">{city.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Your Invitations Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Invitations</h2>
            <div className="max-w-md">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-purple-400 to-indigo-600"></div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">E</span>
                    </div>
                    <span className="text-sm text-gray-600">Emily invited you to join</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#ff5a58]" />
                    <span className="text-sm text-gray-600">Kuala Lumpur, Malaysia</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cuti-Cuti Malaysia</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>3 Participants</span>
                    <span>Jul 20 - Jul 26, 2025</span>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Decline
                    </button>
                    <button className="flex-1 bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
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
