"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";
import { Home, MapPin, Users, Bookmark, Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import CreateTripModal from "@/components/CreateTripModal";
import DestinationImage from "@/components/DestinationImage";
import Image from "next/image";
import { motion } from "framer-motion";

interface Trip {
  id: string;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  interests: string[];
  collaborators: string[];
  created_at: string;
}

interface Invitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_name?: string;
  status: string;
  invited_at: string;
  expires_at: string;
  trips: {
    id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    description: string;
    profiles: {
      name: string;
      email: string;
    };
  };
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const router = useRouter();

  const fetchInvitations = async (user: User) => {
    try {
      setInvitationsLoading(true);
      
      // Get user's email from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      console.log('Profile fetch result:', { profile, profileError });

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setInvitationsLoading(false);
        return;
      }

      if (!profile?.email) {
        console.log('No email found for user:', user.id);
        setInvitationsLoading(false);
        return;
      }

      // Fetch pending invitations for this user's email (simplified query)
      const { data: invitationsData, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitee_email', profile.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('invited_at', { ascending: false });

      console.log('Invitations fetch result:', { invitationsData, error });

      if (error) {
        console.error('Error fetching invitations:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setInvitationsLoading(false);
        return;
      }

      // Now fetch trip details for each invitation
      const invitationsWithTrips = [];
      for (const invitation of invitationsData || []) {
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('id, title, destination, start_date, end_date, description, owner_id')
          .eq('id', invitation.trip_id)
          .single();

        if (!tripError && trip) {
          invitationsWithTrips.push({
            ...invitation,
            trips: trip
          });
        }
      }

      console.log('Successfully fetched invitations:', invitationsWithTrips.length);
      setInvitations(invitationsWithTrips);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    // Check current user session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      return user;
    };

    const fetchData = async () => {
      const user = await getUser();
      if (user) {
        // Fetch user's trips (both owned and collaborated)
        const { data: tripsData, error } = await supabase
          .from('trips')
          .select('*')
          .or(`owner_id.eq.${user.id},collaborators.cs.{${user.id}}`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching trips:', error);
          toast.error('Failed to load trips');
        } else {
          setTrips(tripsData || []);
        }

        // Fetch user's invitations
        await fetchInvitations(user);
      }
      setLoading(false);
    };

    fetchData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/');
        } else if (session?.user) {
          setUser(session.user);
          // Refetch trips when user changes
          const { data: tripsData, error } = await supabase
            .from('trips')
            .select('*')
            .eq('owner_id', session.user.id)
            .order('created_at', { ascending: false });

          if (!error) {
            setTrips(tripsData || []);
          }
          
          // Refetch invitations
          await fetchInvitations(session.user);
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

  const handleTripCreated = async () => {
    // Refresh trips data
    if (user) {
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setTrips(tripsData || []);
      }
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    if (!user) return;

    console.log('Handling invitation response:', { invitationId, action, user: user.id });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Session token available:', !!token);
      console.log('Token length:', token?.length);
      console.log('Request body:', JSON.stringify({ invitationId, action }));

      const response = await fetch('/api/invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invitationId,
          action
        })
      });

      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to respond to invitation');
      }

      toast.success(data.message);
      
      // Refresh invitations
      await fetchInvitations(user);
      
      // If accepted, also refresh trips (both owned and collaborated)
      if (action === 'accept') {
        const { data: tripsData, error } = await supabase
          .from('trips')
          .select('*')
          .or(`owner_id.eq.${user.id},collaborators.cs.{${user.id}}`)
          .order('created_at', { ascending: false });

        if (!error) {
          setTrips(tripsData || []);
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to respond to invitation');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getGradientClass = (index: number) => {
    const gradients = [
      'from-green-400 to-green-600',
      'from-blue-400 to-purple-600',
      'from-red-400 to-orange-600',
      'from-purple-400 to-indigo-600',
      'from-yellow-400 to-red-600',
      'from-pink-400 to-rose-600'
    ];
    return gradients[index % gradients.length];
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    return 'Less than an hour remaining';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header - floating frosted glass navbar */}
        <motion.header
          className="fixed top-4 inset-x-0 z-30 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-[1200px] px-3">
            <motion.div
              className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md shadow-lg shadow-black/5 flex items-center justify-between"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Image src="/assets/ryokolong.png" alt="Ryoko logo" width={120} height={40} />
              </motion.div>
              <motion.nav
                className="flex items-center gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="p-2 text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/trips')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/social')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/bookmark')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </motion.nav>
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-dark-medium text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </motion.div>
            </motion.div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          {/* Active Trips Section */}
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark">Active Trips</h2>
              <button 
                onClick={() => setShowCreateTripModal(true)}
                className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create New Trip +
              </button>
            </div>
            
            {loading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-300"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded mb-2"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : trips.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {trips.map((trip, index) => (
                  <motion.div
                    key={trip.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/trip/${trip.id}`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <DestinationImage 
                      destination={trip.destination || ''}
                      className="h-48"
                      fallbackClassName={`bg-gradient-to-br ${getGradientClass(index)}`}
                    />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-[#ff5a58]" />
                        <span className="text-sm text-gray-600">{trip.destination || 'No destination'}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-dark">{trip.title}</h3>
                        {trip.owner_id === user?.id ? (
                          <span className="px-2 py-1 bg-[#ff5a58] text-white text-xs rounded-full">Owner</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">Collaborator</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{trip.collaborators ? trip.collaborators.length + 1 : 1} Participants</span>
                        <span>
                          {trip.start_date && trip.end_date 
                            ? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`
                            : 'No dates set'
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-dark mb-2">No trips yet</h3>
                <p className="text-form mb-6">Create your first trip to get started with planning your adventure!</p>
                <button 
                  onClick={() => setShowCreateTripModal(true)}
                  className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create Your First Trip
                </button>
              </div>
            )}
          </section>


          {/* Your Invitations Section - Only show if there are invitations or loading */}
          {(invitationsLoading || invitations.length > 0) && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-dark mb-6">Your Invitations</h2>
              
              {invitationsLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                      <div className="h-32 bg-gray-300"></div>
                      <div className="p-4">
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-6 bg-gray-300 rounded mb-2"></div>
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-300 rounded w-20"></div>
                          <div className="h-4 bg-gray-300 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : invitations.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {invitations.map((invitation, index) => (
                    <motion.div
                      key={invitation.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <DestinationImage 
                        destination={invitation.trips.destination || ''}
                        className="h-32"
                        fallbackClassName={`bg-gradient-to-br ${getGradientClass(index)}`}
                      />
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-6 h-6 bg-[#ff5a58] rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-medium">
                              {invitation.invitee_name?.charAt(0) || invitation.invitee_email?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">
                            You were invited to join
                          </span>
                        </div>
                        
                        {invitation.trips.destination && (
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-[#ff5a58]" />
                            <span className="text-sm text-gray-600">{invitation.trips.destination}</span>
                          </div>
                        )}
                        
                        <h3 className="font-semibold text-dark mb-2">{invitation.trips.title}</h3>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <span>
                            {invitation.trips.start_date && invitation.trips.end_date 
                              ? `${formatDate(invitation.trips.start_date)} - ${formatDate(invitation.trips.end_date)}`
                              : 'No dates set'
                            }
                          </span>
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">{formatTimeRemaining(invitation.expires_at)}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              console.log('Decline button clicked, invitation:', invitation);
                              handleInvitationResponse(invitation.id, 'decline');
                            }}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Accept button clicked, invitation:', invitation);
                              handleInvitationResponse(invitation.id, 'accept');
                            }}
                            className="flex-1 bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </section>
          )}
        </main>

        {/* Create Trip Modal */}
        <CreateTripModal
          open={showCreateTripModal}
          onClose={() => setShowCreateTripModal(false)}
          onTripCreated={handleTripCreated}
        />
      </div>
    </ProtectedRoute>
  );
}
