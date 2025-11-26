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
    const checkBannedStatus = async () => {
      if (!loading && !user) {
        router.push('/');
        return;
      }

      if (user) {
        // Check if user is banned
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', user.id)
          .single();

        if (profile?.is_banned) {
          // Sign out and redirect
          await supabase.auth.signOut();
          toast.error("Your account has been banned. Please contact support if you believe this is an error.");
          router.push('/');
          return;
        }
      }

      setCheckingBan(false);
    };

    checkBannedStatus();
  }, [user, loading, router]);

  if (loading || checkingBan) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
