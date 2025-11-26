"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Loading from "@/components/Loading";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push('/');
          setAllowed(false);
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profileError || profile?.role !== 'admin') {
          router.push('/');
          setAllowed(false);
          return;
        }
        
        setAllowed(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/');
        setAllowed(false);
      }
    };
    check();
  }, [router]);

  if (allowed === null) {
    return <Loading />;
  }
  if (!allowed) {
    return null;
  }
  return <>{children}</>;
}


