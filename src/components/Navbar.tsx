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
  const [isAdmin, setIsAdmin] = useState(false);
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
        setIsAdmin(profile?.role === 'admin');
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth user data
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name,
          avatar_url: undefined
        });
        setIsAdmin(false);
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
      setIsAdmin(profile?.role === 'admin');
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      // For admin, match any path that starts with /admin
      return pathname.startsWith('/admin');
    }
    return pathname === path;
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="cursor-pointer">
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
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm transition-colors cursor-pointer ${
                    isActive('/dashboard') 
                      ? 'text-[#ff5a58]' 
                      : 'text-gray-600 hover:text-[#ff5a58]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/social"
                  className={`text-sm transition-colors cursor-pointer ${
                    isActive('/social') 
                      ? 'text-[#ff5a58]' 
                      : 'text-gray-600 hover:text-[#ff5a58]'
                  }`}
                >
                  Social
                </Link>
                <Link
                  href="/bookmark"
                  className={`text-sm transition-colors cursor-pointer ${
                    isActive('/bookmark') 
                      ? 'text-[#ff5a58]' 
                      : 'text-gray-600 hover:text-[#ff5a58]'
                  }`}
                >
                  Bookmarks
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`text-sm transition-colors cursor-pointer ${
                      isActive('/admin') 
                        ? 'text-[#ff5a58]' 
                        : 'text-gray-600 hover:text-[#ff5a58]'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            ) : null}
          </nav>

          {showProfile ? (
            user && !loading ? (
              <ProfileDropdown user={user} onProfileUpdated={handleProfileUpdated} />
            ) : (
              <div className="w-8 h-8"></div>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}
