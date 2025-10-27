/**
 * Navbar Component
 * 
 * The main navigation bar for authenticated users.
 * Features the Ryoko logo, navigation links (Dashboard, Bookmarks, Social),
 * and user profile dropdown. Includes animated hover effects and active state indicators.
 * Fetches user profile data and handles profile updates.
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface NavbarProps {
  showProfile?: boolean;
}

export default function Navbar({ showProfile = true }: NavbarProps) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
    
    const fetchUserProfile = async () => {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: profile?.name || authUser.user_metadata?.name,
          avatar_url: profile?.avatar_url
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth user data
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name,
          avatar_url: undefined
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser, authLoading]);

  const handleProfileUpdated = async () => {
    if (user) {
      // Refresh user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUser(prev => prev ? {
        ...prev,
        name: profile?.name || prev.name,
        avatar_url: profile?.avatar_url || prev.avatar_url
      } : null);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <motion.header
      className="fixed top-4 inset-x-0 z-30 flex justify-center pointer-events-none"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[1400px] px-4">
        <motion.div
          className="relative px-4 py-2 rounded-full bg-white shadow-lg shadow-black/5 flex items-center justify-between"
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link href="/dashboard">
              <Image 
                src="/assets/ryokolong.png" 
                alt="Ryoko logo" 
                width={120} 
                height={40} 
                className="hidden sm:block"
              />
              <Image 
                src="/assets/ryokoicon.png" 
                alt="Ryoko logo" 
                width={40} 
                height={40} 
                className="block sm:hidden"
              />
            </Link>
          </motion.div>
          
          <motion.nav
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/dashboard') 
                      ? 'text-[#ff5a58]' 
                      : 'text-gray-600 hover:text-[#ff5a58]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/social"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/social') 
                      ? 'text-[#ff5a58]' 
                      : 'text-gray-600 hover:text-[#ff5a58]'
                  }`}
                >
                  Social
                </Link>
                <Link
                  href="/bookmark"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/bookmark') 
                      ? 'text-[#ff5a58]' 
                      : 'text-gray-600 hover:text-[#ff5a58]'
                  }`}
                >
                  Bookmarks
                </Link>
              </>
            ) : (
              // Placeholder div to maintain consistent spacing when not authenticated
              <div className="flex items-center gap-6">
                <div className="w-20 h-4"></div>
                <div className="w-20 h-4"></div>
                <div className="w-12 h-4"></div>
              </div>
            )}
          </motion.nav>

          {showProfile ? (
            user && !loading ? (
              <ProfileDropdown user={user} onProfileUpdated={handleProfileUpdated} />
            ) : (
              // Placeholder div to maintain consistent spacing when loading or not authenticated
              <div className="w-8 h-8"></div>
            )
          ) : null}
        </motion.div>
      </div>
    </motion.header>
  );
}
