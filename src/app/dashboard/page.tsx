"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check current user session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/');
        } else if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Check for email verification success
  useEffect(() => {
    // Check both query parameters and hash parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the # and parse
    
    const type = urlParams.get('type') || hashParams.get('type');
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

    if (type === 'signup' && !error) {
      toast.success("Email verification successful! Welcome to your dashboard.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(errorDescription || "Email verification failed. Please try again.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-[#ff5a58]">RYOKO</h1>
                <span className="ml-4 text-gray-500">Dashboard</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user?.user_metadata?.name || user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome to Ryoko!</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#ffd85d] p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-[#9F8B39] mb-2">Plan Your Trip</h3>
                <p className="text-[#9F8B39] text-sm">Start creating your next adventure with friends and family.</p>
              </div>
              
              <div className="bg-[#58b6ff] p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-[#22668D] mb-2">Collaborate</h3>
                <p className="text-[#22668D] text-sm">Invite your travel companions and plan together in real-time.</p>
              </div>
              
              <div className="bg-[#ff9558] p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-[#9C572D] mb-2">Track Expenses</h3>
                <p className="text-[#9C572D] text-sm">Keep track of all your travel expenses and split costs easily.</p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Account</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Name:</strong> {user?.user_metadata?.name || "Not provided"}</p>
                <p><strong>Member since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
