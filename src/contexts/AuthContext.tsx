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
      // Safety timeout to prevent infinite loading - reduced from 10s to 5s
      const timeoutId = setTimeout(() => {
        console.warn("[AuthContext] Timeout reached in getInitialSession, clearing loading state");
        setUser(null);
        setLoading(false);
      }, 5000); // 5 second timeout

      try {
        // Check if this is a recovery session (password reset flow)
        console.log("[AuthContext] getInitialSession start");
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(hash.substring(1));
        const isRecovery = (urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery') && hash.includes('access_token');
        console.log("[AuthContext] URL state on init", {
          hash,
          search: window.location.search,
          isRecovery,
          queryType: urlParams.get('type'),
          hashType: hashParams.get('type'),
        });

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthContext] Error getting session:", error);
          clearTimeout(timeoutId);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("[AuthContext] Initial session result", {
          hasSession: !!session,
          userId: session?.user?.id,
          isRecovery,
        });
        
        // Don't set user for recovery sessions - user should only be logged in after resetting password
        if (isRecovery && session) {
          clearTimeout(timeoutId);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          const isBanned = await checkAndHandleBannedUser(session.user.id);
          if (isBanned) {
            clearTimeout(timeoutId);
            setUser(null);
            setLoading(false);
            return;
          }
        }
        clearTimeout(timeoutId);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error("[AuthContext] Error in getInitialSession:", error);
        // Always clear loading state even on error to prevent stuck loading
        clearTimeout(timeoutId);
        setUser(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthContext] onAuthStateChange event", {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
        });

        // If the user just updated (e.g. finished password reset), redirect them
        // to the dashboard when this happens in the password recovery flow.
        if (event === 'USER_UPDATED') {
          const hash = window.location.hash;
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(hash.substring(1));
          const isRecovery =
            (urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery') &&
            (hash.includes('access_token') || urlParams.get('access_token'));

          console.log("[AuthContext] USER_UPDATED handler", {
            pathname: window.location.pathname,
            search: window.location.search,
            hash,
            isRecovery,
          });

          if (isRecovery && session?.user) {
            console.log("[AuthContext] Detected password recovery USER_UPDATED, redirecting to dashboard");
            // Clean URL and redirect so the app re-initializes with the new session
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.href = "/dashboard?password_reset_success=1";
            return;
          }
        }

        // Don't set user for PASSWORD_RECOVERY event - this is a temporary recovery session
        // User should only be logged in after successfully resetting password
        if (event === 'PASSWORD_RECOVERY') {
          setUser(null);
          setLoading(false);
          return;
        }
        
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
