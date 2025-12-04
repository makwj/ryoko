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
  const [checkingBan, setCheckingBan] = useState(false);

  useEffect(() => {
    // If auth is still loading, don't check ban yet
    if (loading) {
      return;
    }

    // If no user, redirect immediately
    if (!user) {
      router.push('/');
      return;
    }

    // Only check ban status if we have a user and auth is ready
    // Use a shorter timeout and make it non-blocking
    const timeoutId = setTimeout(() => {
      console.warn('[ProtectedRoute] Ban check timeout, allowing access');
      setCheckingBan(false);
    }, 3000); // 3 second timeout instead of 10

    setCheckingBan(true);

    const checkBannedStatus = async () => {
      try {
        // Check if user is banned with a timeout
        const profilePromise = supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', user.id)
          .single();

        // Race between the profile check and a timeout
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ timeout: true }), 2000)
        );

        const result = await Promise.race([profilePromise, timeoutPromise]);

        if ('timeout' in result && result.timeout) {
          // Timeout - allow access but log warning
          console.warn('[ProtectedRoute] Ban check timed out, allowing access');
          clearTimeout(timeoutId);
          setCheckingBan(false);
          return;
        }

        const { data: profile, error } = result as any;

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

  // Show loading only if auth is loading, not during ban check
  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  // Don't block on ban check - allow content to render while checking
  // The ban check will redirect if needed
  return <>{children}</>;
}
