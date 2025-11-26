/**
 * AuthContext - Authentication Context Provider
 * 
 * Provides authentication state management for the entire application.
 * Handles user login/logout, session management, and authentication state.
 * Uses Supabase Auth for authentication with automatic session restoration.
 * Provides useAuth hook for components to access authentication state.
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Helper function to check if user is banned and sign them out if so
    const checkAndHandleBannedUser = async (userId: string | undefined) => {
      if (!userId) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', userId)
        .single();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        return true;
      }
      return false;
    };

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isBanned = await checkAndHandleBannedUser(session.user.id);
        if (isBanned) {
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const isBanned = await checkAndHandleBannedUser(session.user.id);
          if (isBanned) {
            setUser(null);
            setLoading(false);
            return;
          }
        }
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
