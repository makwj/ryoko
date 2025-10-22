/**
 * A route wrapper for public pages that don't require authentication
 * Shows loading state while checking authentication status, then renders children
 * Used for landing page
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import Loading from "./Loading";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return <>{children}</>;
}
