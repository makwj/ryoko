/**
 * ProtectedRoute Component
 * 
 * A route wrapper that protects pages requiring authentication.
 * Redirects unauthenticated users to the home page and shows loading state
 * while checking authentication status. Only renders children if user is authenticated.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import Loading from "./Loading";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingBan, setCheckingBan] = useState(true);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('[ProtectedRoute] Timeout reached, clearing loading state');
      setCheckingBan(false);
    }, 10000); // 10 second timeout

    const checkBannedStatus = async () => {
      try {
        if (!loading && !user) {
          router.push('/');
          clearTimeout(timeoutId);
          setCheckingBan(false);
          return;
        }

        if (user) {
          // Check if user is banned
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_banned')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('[ProtectedRoute] Error checking ban status:', error);
            // If we can't check ban status, allow access but log the error
            clearTimeout(timeoutId);
            setCheckingBan(false);
            return;
          }

          if (profile?.is_banned) {
            // Sign out and redirect
            await supabase.auth.signOut();
            toast.error("Your account has been banned. Please contact support if you believe this is an error.");
            router.push('/');
            clearTimeout(timeoutId);
            setCheckingBan(false);
            return;
          }
        }

        clearTimeout(timeoutId);
        setCheckingBan(false);
      } catch (error) {
        console.error('[ProtectedRoute] Error in checkBannedStatus:', error);
        // Always clear loading state even on error to prevent stuck loading
        clearTimeout(timeoutId);
        setCheckingBan(false);
      }
    };

    checkBannedStatus();

    return () => clearTimeout(timeoutId);
  }, [user, loading, router]);

  if (loading || checkingBan) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
