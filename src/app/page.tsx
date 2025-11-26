"use client";

/**
 * Landing Page Component
 * 
 * Modern SaaS-style landing page featuring the Ryoko brand and value proposition.
 * Includes animated hero section, feature showcase, stats, and call-to-action.
 * Handles user authentication flow with login/register modals.
 * Features smooth animations, responsive design, and email verification handling.
 */

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AuthModal from "@/components/AuthModal";
import PublicRoute from "@/components/PublicRoute";
import UserProfileDialog from "@/components/UserProfileDialog";
import { ArrowRight, MapPin, Sparkles, Calendar, MessageCircle, Globe, Zap, Clock, Pencil, Users } from "lucide-react";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

function CountUp({ end, duration = 1200, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            setStarted(true);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let rafId = 0;
    const startTime = performance.now();
    const from = 0;
    const to = end;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const current = Math.round(from + (to - from) * eased);
      setValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [started, end, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
    hover: {
      y: -8,
      transition: { duration: 0.2 },
    },
  };

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot-password" | "reset-password">("login");
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Statistics state
  const [stats, setStats] = useState({
    totalTrips: 0,
    uniqueCountries: 0,
    totalUsers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeFeature, setActiveFeature] = useState(1);
  
  // Add loading delay to show the full loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Redirect logged-in users to dashboard
  // This should happen immediately when auth state is ready, not wait for loading animation
  useEffect(() => {
    if (!authLoading && user) {
      // Small delay to ensure auth state is fully propagated
      const redirectTimer = setTimeout(() => {
        router.push('/dashboard');
      }, 100);
      return () => clearTimeout(redirectTimer);
    }
  }, [user, authLoading, router]);

  // Check for email verification success and password reset
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const type = urlParams.get('type') || hashParams.get('type');
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

    if (type === 'signup' && !error) {
      toast.success("Email verification successful! You can now sign in to your account.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (type === 'recovery' && !error) {
      setAuthMode("reset-password");
      setAuthOpen(true);
    } else if (error) {
      toast.error(errorDescription || "Email verification failed. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch statistics from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const { supabase } = await import('@/lib/supabase');
        
        const { count: tripsCount } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true });
        
        const { data: tripsData } = await supabase
          .from('trips')
          .select('destination');
        
        const countriesSet = new Set<string>();
        if (tripsData) {
          tripsData.forEach((trip) => {
            if (trip.destination) {
              const parts = trip.destination.split(',').map((p: string) => p.trim());
              const country = parts[parts.length - 1];
              if (country) {
                countriesSet.add(country);
              }
            }
          });
        }
        
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        setStats({
          totalTrips: tripsCount || 0,
          uniqueCountries: countriesSet.size,
          totalUsers: usersCount || 0,
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  const handleAuthModeChange = (mode: "login" | "register" | "forgot-password" | "reset-password") => {
    setAuthMode(mode);
  };

  const openSignUp = () => {
    setAuthMode("register");
    setAuthOpen(true);
  };

  if (authLoading || (user && !isLoading)) {
    return <Loading />;
  }
  
  return (
    <PublicRoute>
      {isLoading ? (
        <Loading />
      ) : (
        <div className="font-sans min-h-screen bg-white text-[#1a1a1a] antialiased">
          <AuthModal 
            open={authOpen} 
            mode={authMode} 
            onClose={() => setAuthOpen(false)} 
            onModeChange={handleAuthModeChange}
          />
          
          {/* Modern Header */}
          <motion.header
            className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <motion.div
                  className="flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Image src="/assets/ryokolong.png" alt="Ryoko logo" width={120} height={40} />
                </motion.div>
                <motion.nav
                  className="hidden md:flex items-center gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {user ? (
                    <>
                      <button 
                        onClick={() => router.push('/dashboard')}
                        className="text-sm text-gray-600 hover:text-[#ff5a58] transition-colors cursor-pointer"
                      >
                        Dashboard
                      </button>
                      <button 
                        onClick={() => router.push('/social')}
                        className="text-sm text-gray-600 hover:text-[#ff5a58] transition-colors cursor-pointer"
                      >
                        Social
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href="#features"
                        className="text-sm text-gray-600 hover:text-[#ff5a58] transition-colors cursor-pointer"
                      >
                        Features
                      </a>
                      <a
                        href="#guides"
                        className="text-sm text-gray-600 hover:text-[#ff5a58] transition-colors cursor-pointer"
                      >
                        Guides
                      </a>
                      <a
                        href="#about"
                        className="text-sm text-gray-600 hover:text-[#ff5a58] transition-colors cursor-pointer"
                      >
                        About
                      </a>
                    </>
                  )}
                </motion.nav>
                <motion.div
                  className="flex items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {!user && (
                    <>
                      <button
                        className="text-sm font-medium text-gray-700 hover:text-[#ff5a58] transition-colors cursor-pointer"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthOpen(true);
                        }}
                      >
                        Sign In
                      </button>
                      <button
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#ff5a58] hover:bg-[#ff4a47] transition-colors shadow-sm cursor-pointer"
                        onClick={() => {
                          setAuthMode("register");
                          setAuthOpen(true);
                        }}
                      >
                        Get Started
                      </button>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.header>

          {/* Hero Section */}
          <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,90,88,0.1),transparent_50%)] -z-10" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
                    Plan Together
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5a58] to-[#ff9558]">
                      Travel Smarter
                    </span>
                  </h1>
                </motion.div>
                
                <motion.p
                  className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Ryoko revolutionizes group trip planning with AI-powered recommendations, real-time collaboration, and seamless expense management.
                </motion.p>
                
                <motion.div
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <button
                    className="px-8 py-4 rounded-lg text-base font-semibold text-white bg-gradient-to-r from-[#ff5a58] to-[#ff9558] hover:from-[#ff4a47] hover:to-[#ff8550] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthOpen(true);
                    }}
                  >
                    Get Started Free
                  </button>
                  <button
                    className="px-8 py-4 rounded-lg text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 hover:border-[#ff5a58] hover:text-[#ff5a58] transition-all cursor-pointer"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthOpen(true);
                    }}
                  >
                    Sign In
                  </button>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="relative py-32 bg-gradient-to-r from-[#ff5a58] to-[#ff9558] overflow-hidden">
            {/* Decorative images */}
            <div className="absolute bottom-0 left-0 z-0">
              <Image 
                src="/assets/stats1.png" 
                alt="decorative" 
                width={380} 
                height={380} 
                className="hidden xl:block" 
              />
            </div>
            <div className="absolute bottom-0 right-0 z-0">
              <Image 
                src="/assets/stats2.png" 
                alt="decorative" 
                width={380} 
                height={380} 
                className="hidden xl:block" 
              />
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                    {statsLoading ? (
                      <span>0</span>
                    ) : (
                      <CountUp end={stats.totalTrips} />
                    )}
                  </div>
                  <div className="text-white/90 text-lg">Trips Planned</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                    {statsLoading ? (
                      <span>0</span>
                    ) : (
                      <CountUp end={stats.uniqueCountries} />
                    )}
                  </div>
                  <div className="text-white/90 text-lg">Countries Explored</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                    {statsLoading ? (
                      <span>0</span>
                    ) : (
                      <CountUp end={stats.totalUsers} />
                    )}
                  </div>
                  <div className="text-white/90 text-lg">Active Users</div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Before/After Section */}
          <section className="py-16 md:py-24 bg-white">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Before Card */}
                <motion.div
                  className="rounded-2xl bg-white shadow-lg ring-2 ring-inset ring-gray-200"
                  initial={{ opacity: 0, x: -100, y: 100 }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="p-8 sm:p-12">
                    <div className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 256 256"
                      >
                        <path d="M232,184a8,8,0,0,1-16,0A88,88,0,0,0,67.47,120.16l26.19,26.18A8,8,0,0,1,88,160H24a8,8,0,0,1-8-8V88a8,8,0,0,1,13.66-5.66l26.48,26.48A104,104,0,0,1,232,184Z"></path>
                      </svg>
                      <p className="text-base font-semibold text-gray-700">Before</p>
                    </div>
                    <h3 className="font-display mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                      Traditional trip planning that wastes time and causes stress
                    </h3>
                    <ul className="mt-6 space-y-3 text-base text-gray-600 sm:text-lg">
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            className="h-4 w-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </div>
                        Scattered planning across multiple apps, emails, and spreadsheets
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            className="h-4 w-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </div>
                        Endless group chats and confusion about who&apos;s responsible for what
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            className="h-4 w-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </div>
                        Manual expense tracking leads to awkward money conversations
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            className="h-4 w-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </div>
                        Hours spent researching destinations without personalized recommendations
                      </li>
                    </ul>
                  </div>
                </motion.div>

                {/* After Card */}
                <motion.div
                  className="rounded-2xl bg-gradient-to-br from-[#ff5a58] to-[#ff9558] shadow-lg ring-1 ring-inset ring-[#ff5a58]/30"
                  initial={{ opacity: 0, x: 100, y: 100 }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                >
                  <div className="p-8 sm:p-12">
                    <div className="inline-flex items-center gap-2">
                      <p className="text-base font-semibold text-white/90">After</p>
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6 text-white/90"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 256 256"
                      >
                        <path d="M229.66,109.66l-48,48a8,8,0,0,1-11.32-11.32L212.69,104,170.34,61.66a8,8,0,0,1,11.32-11.32l48,48A8,8,0,0,1,229.66,109.66Zm-48-11.32-48-48A8,8,0,0,0,120,56V96.3A104.15,104.15,0,0,0,24,200a8,8,0,0,0,16,0,88.11,88.11,0,0,1,80-87.63V152a8,8,0,0,0,13.66,5.66l48-48A8,8,0,0,0,181.66,98.34Z"></path>
                      </svg>
                    </div>
                    <h3 className="font-display mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      A collaborative platform that makes trip planning effortless
                    </h3>
                    <ul className="mt-6 space-y-3 text-base text-white sm:text-lg">
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            aria-hidden="true"
                            className="h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 256 256"
                          >
                            <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path>
                          </svg>
                        </div>
                        All-in-one hub for itineraries, budgets, and bookings in one place
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            aria-hidden="true"
                            className="h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 256 256"
                          >
                            <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path>
                          </svg>
                        </div>
                        Real-time collaboration with voting, chat, and instant updates
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            aria-hidden="true"
                            className="h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 256 256"
                          >
                            <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path>
                          </svg>
                        </div>
                        Automatic expense tracking and easy splitting with your group
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="shrink-0 py-1.5">
                          <svg
                            aria-hidden="true"
                            className="h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 256 256"
                          >
                            <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path>
                          </svg>
                        </div>
                        AI-powered recommendations tailored to your interests and preferences
                      </li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Features Section - Accordion Style */}
          <section id="features" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Everything you need to plan the perfect trip
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  All-in-one platform for collaborative travel planning
                </p>
              </motion.div>

              <div className="max-w-5xl mx-auto">
                <div className="flex flex-col gap-12 md:flex-row md:gap-24">
                  <div className="grid grid-cols-1 items-stretch gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-24">
                    <ul className="w-full">
                      {[
                        {
                          id: 1,
                          title: "All-in-One Planning Hub",
                          description: "Bring itineraries, budgets, and bookings into one organized place. Never miss a detail with our comprehensive planning tools.",
                          additionalInfo: [
                            "Save hours of planning time",
                            "Get organized itineraries",
                            "Customize to your needs",
                          ],
                          icons: [
                            <Clock key="clock" className="h-4 w-4 text-[#ff5a58]" />,
                            <Calendar key="calendar" className="h-4 w-4 text-[#ff5a58]" />,
                            <Pencil key="pencil" className="h-4 w-4 text-[#ff5a58]" />,
                          ],
                        },
                        {
                          id: 2,
                          title: "Real-Time Collaboration",
                          description: "Vote, chat, and coordinate with your group in seconds. Plan together seamlessly with live updates and instant communication.",
                          additionalInfo: [
                            "Instant group coordination",
                            "Live voting and decisions",
                            "Real-time updates",
                          ],
                          icons: [
                            <MessageCircle key="chat" className="h-4 w-4 text-[#ff5a58]" />,
                            <Users key="users" className="h-4 w-4 text-[#ff5a58]" />,
                            <Zap key="zap" className="h-4 w-4 text-[#ff5a58]" />,
                          ],
                        },
                        {
                          id: 3,
                          title: "AI-Powered Recommendations",
                          description: "Get personalized suggestions for activities, restaurants, and attractions based on your interests. Let AI help you discover amazing experiences.",
                          additionalInfo: [
                            "Smart activity suggestions",
                            "Personalized recommendations",
                            "Discover hidden gems",
                          ],
                          icons: [
                            <Sparkles key="sparkles" className="h-4 w-4 text-[#ff5a58]" />,
                            <Globe key="globe" className="h-4 w-4 text-[#ff5a58]" />,
                            <MapPin key="mappin" className="h-4 w-4 text-[#ff5a58]" />,
                          ],
                        },
                      ].map((feature) => (
                        <li
                          key={feature.id}
                          className={feature.id !== 3 ? "border-b border-gray-200" : ""}
                        >
                          <button
                            className="relative flex w-full items-center gap-2 py-4 text-left text-base font-medium md:text-lg cursor-pointer"
                            aria-expanded={activeFeature === feature.id}
                            onClick={() => setActiveFeature(feature.id)}
                          >
                            <span
                              className={`duration-100 ${
                                activeFeature === feature.id
                                  ? "font-bold text-[#ff5a58]"
                                  : "text-gray-400"
                              }`}
                            >
                              {feature.id}.{" "}
                            </span>
                            <span
                              className={`flex-1 text-gray-700 ${
                                activeFeature === feature.id
                                  ? "font-bold text-[#ff5a58]"
                                  : ""
                              }`}
                            >
                              <h3 className="inline">{feature.title}</h3>
                            </span>
                            <span className="ml-auto">
                              <svg
                                className="ml-auto h-[10px] w-[10px] flex-shrink-0 fill-gray-600"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  y="7"
                                  width="16"
                                  height="2"
                                  rx="1"
                                  className={`origin-center transform transition duration-200 ease-out ${
                                    activeFeature === feature.id ? "rotate-180" : ""
                                  }`}
                                />
                                <rect
                                  y="7"
                                  width="16"
                                  height="2"
                                  rx="1"
                                  className={`origin-center rotate-90 transform transition duration-200 ease-out ${
                                    activeFeature === feature.id
                                      ? "hidden rotate-180"
                                      : ""
                                  }`}
                                />
                              </svg>
                            </span>
                          </button>
                          <div
                            className="overflow-hidden text-gray-700 transition-all duration-300 ease-in-out"
                            style={{
                              maxHeight: activeFeature === feature.id ? "1000px" : "0",
                              opacity: activeFeature === feature.id ? 1 : 0,
                            }}
                          >
                            <div className="pb-8">
                              <div className="leading-relaxed text-gray-600 mb-4">
                                <p>{feature.description}</p>
                              </div>
                              <div className="mt-4 space-y-1.5">
                                {Array.isArray(feature.additionalInfo) ? (
                                  feature.additionalInfo.map((info, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-1.5 text-sm font-medium text-gray-700"
                                    >
                                      {feature.icons?.[index]}
                                      {info}
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    {feature.icons}
                                    {feature.additionalInfo}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-center">
                      {[
                        {
                          id: 1,
                          image: "/assets/feature1-placeholder.gif",
                        },
                        {
                          id: 2,
                          image: "/assets/feature2-placeholder.gif",
                        },
                        {
                          id: 3,
                          image: "/assets/feature3-placeholder.gif",
                        },
                      ].map((feature) => (
                        <div
                          key={feature.id}
                          className={`w-full transition-opacity duration-300 ${
                            activeFeature === feature.id
                              ? "opacity-100"
                              : "hidden opacity-0"
                          }`}
                        >
                          <Image
                            alt={`Feature ${feature.id}`}
                            src={feature.image}
                            width={500}
                            height={500}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 object-contain object-center sm:w-[26rem]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Top Guides Section */}
          <section id="guides" className="py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Top <span className="text-[#ff5a58]">Travel Guides</span>
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Discover amazing trips planned by our community
                </p>
              </motion.div>
              <FeaturedGuidesGrid containerVariants={containerVariants} cardVariants={cardVariants} />
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-24 bg-gradient-to-br from-[#ff5a58] to-[#ff9558]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Ready to plan your next adventure?
                </h2>
                <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                  Join thousands of travelers who are already planning amazing trips with Ryoko.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    className="px-8 py-4 rounded-lg text-base font-semibold text-[#ff5a58] bg-white hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                    onClick={openSignUp}
                  >
                    Get Started Free
                  </button>
                  <button
                    className="px-8 py-4 rounded-lg text-base font-semibold text-white border-2 border-white/30 hover:border-white/50 transition-all cursor-pointer"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthOpen(true);
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Footer */}
          <footer id="about" className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-bold mb-4">About Ryoko</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Ryoko is a collaborative travel planning platform built for group travelers. From trip
                    ideation to budgeting and post-trip memories, keep everything in one place.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Our Mission</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We help keep everything organized in one place so you can focus on making memories, not
                    managing logistics.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Get Started</h3>
                  <button
                    className="flex items-center gap-2 text-sm font-medium text-white hover:text-[#ff5a58] transition-colors cursor-pointer"
                    onClick={openSignUp}
                  >
                    Sign Up Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-8">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>© 2025 Ryoko. All rights reserved.</span>
                  <span>Capstone Project</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}
    </PublicRoute>
  );
}

function FeaturedGuidesGrid({ containerVariants, cardVariants }: { containerVariants: any; cardVariants: any }) {
  const [guides, setGuides] = useState<Array<{ id: string; title: string; destination?: string | null; imageUrl?: string | null; author?: { name?: string | null; avatar_url?: string | null; id?: string } | null; owner_id?: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: trips } = await supabase
          .from('trips')
          .select('id, title, destination, owner_id, updated_at, trip_image_url')
          .eq('shared_to_social', true)
          .eq('archived', false)
          .eq('is_featured_home', true)
          .order('updated_at', { ascending: false })
          .limit(6);
        const list = trips || [];
        const ownerIds = Array.from(new Set(list.map((t: any) => t.owner_id).filter(Boolean)));
        let idToName = new Map<string, string>();
        let idToAvatar = new Map<string, string | null>();
        if (ownerIds.length > 0) {
          const { data: authors } = await supabase.from('profiles').select('id, name, avatar_url').in('id', ownerIds);
          (authors || []).forEach((a: any) => { idToName.set(a.id, a.name || 'User'); idToAvatar.set(a.id, a.avatar_url || null); });
        }
        let mapped = list.map((t: any) => ({ 
          id: t.id, 
          title: t.title, 
          destination: t.destination, 
          imageUrl: t.trip_image_url || null,
          owner_id: t.owner_id,
          author: { 
            id: t.owner_id,
            name: idToName.get(t.owner_id) || 'User', 
            avatar_url: idToAvatar.get(t.owner_id) || null 
          }
        }));
        const unsplashKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
        const pixabayKey = process.env.NEXT_PUBLIC_PIXABAY_API_KEY;

        function parseCityCountry(dest?: string | null): { city: string; country: string } {
          if (!dest) return { city: '', country: '' };
          const parts = dest.split(',').map(p => p.trim()).filter(Boolean);
          if (parts.length === 1) return { city: parts[0], country: '' };
          return { city: parts[0], country: parts[parts.length - 1] };
        }

        const resolved = await Promise.all(mapped.map(async (g) => {
          if (g.imageUrl) return g;
          const { city, country } = parseCityCountry(g.destination || '');
          try {
            if (unsplashKey) {
              const unsplashRes = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)}%20${encodeURIComponent(country)}&per_page=1&orientation=landscape&client_id=${unsplashKey}`
              );
              if (unsplashRes.ok) {
                const data = await unsplashRes.json();
                if (data?.results?.length > 0) {
                  return { ...g, imageUrl: data.results[0].urls.regular as string };
                }
              }
            }
          } catch {}
          try {
            if (pixabayKey) {
              const pixabayRes = await fetch(
                `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(city)}%20${encodeURIComponent(country)}&image_type=photo&orientation=horizontal&category=places&per_page=3&safesearch=true`
              );
              if (pixabayRes.ok) {
                const data = await pixabayRes.json();
                if (data?.hits?.length > 0) {
                  return { ...g, imageUrl: data.hits[0].webformatURL as string };
                }
              }
            }
          } catch {}
          return g;
        }));
        setGuides(resolved);
      } catch {}
    };
    run();
  }, []);

  if (guides.length === 0) {
    return <div className="text-center text-gray-500 py-12">No guides featured yet.</div>;
  }
  return (
    <>
      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {guides.map(g => (
          <motion.article 
            key={g.id} 
            className="group rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-xl"
            variants={cardVariants}
            whileHover="hover"
          >
            <a href={`/trip/view/${g.id}`} className="cursor-pointer">
              {g.imageUrl ? (
                <div className="relative h-48 overflow-hidden">
                  <img src={g.imageUrl} alt={g.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-[#ff5a58] to-[#ff4a47] flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">{g.title}</span>
                </div>
              )}
              <div className="p-6">
                <h4 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2">{g.title}</h4>
                <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[#ff5a58]/10 text-[#ff5a58] mb-4">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{g.destination || 'Guide'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (g.owner_id || g.author?.id) {
                        setSelectedUserId(g.owner_id || g.author?.id || null);
                      }
                    }}
                  >
                    {g.author?.avatar_url ? (
                      <img src={g.author.avatar_url} alt={g.author.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                    )}
                    <span className="text-sm text-gray-600">by {g.author?.name || 'User'}</span>
                  </div>
                </div>
              </div>
            </a>
          </motion.article>
        ))}
      </motion.div>
      {selectedUserId && (
        <UserProfileDialog 
          userId={selectedUserId} 
          isOpen={!!selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </>
  );
}
