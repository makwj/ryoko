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
