"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User } from "@supabase/supabase-js";
import { Home, MapPin, Users, Bookmark } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function BookmarkPage() {
  const [user, setUser] = useState<User | null>(null);
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-dark mb-4">Bookmarks</h1>
            <p className="text-gray-600 mb-8">Save your favorite destinations and travel guides.</p>
            <button className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Explore Destinations
            </button>
          </div>
        </main>

      </div>
    </ProtectedRoute>
  );
}
