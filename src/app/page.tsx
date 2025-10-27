/**
 * Landing Page Component
 * 
 * The main landing page featuring the Ryoko brand and value proposition.
 * Includes animated hero section, feature showcase, stats, and call-to-action.
 * Handles user authentication flow with login/register modals.
 * Features smooth animations, responsive design, and email verification handling.
 */

"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AuthModal from "@/components/AuthModal";
import PublicRoute from "@/components/PublicRoute";
import { ArrowRight, MapPin, Home as HomeIcon, Users, Bookmark } from "lucide-react";
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
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6 },
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 },
    },
  };

  const statsVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);
  
  // Add loading delay to show the full loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 seconds delay instead of 3.5

    return () => clearTimeout(timer);
  }, []);

  // Check for email verification success
  useEffect(() => {
    // Check both query parameters and hash parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the # and parse
    
    const type = urlParams.get('type') || hashParams.get('type');
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

    if (type === 'signup' && !error) {
      toast.success("Email verification successful! You can now sign in to your account.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(errorDescription || "Email verification failed. Please try again.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  const handleAuthModeChange = (mode: "login" | "register") => {
    setAuthMode(mode);
  };

  const openSignUp = () => {
    setAuthMode("register");
    setAuthOpen(true);
  };

  // Show loading while checking auth or redirecting
  if (authLoading || (user && !isLoading)) {
    return <Loading />;
  }
  
  return (
    <PublicRoute>
      {isLoading ? (
        <Loading />
      ) : (
        <motion.div
          className="font-sans min-h-screen bg-white text-[#1a1a1a]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AuthModal 
            open={authOpen} 
            mode={authMode} 
            onClose={() => setAuthOpen(false)} 
            onModeChange={handleAuthModeChange}
          />
          
          {/* Header - floating frosted glass navbar */}
          <motion.header
            className="fixed top-4 inset-x-0 z-30 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="pointer-events-auto mx-auto w-full max-w-[1200px] px-3">
              <motion.div
                className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md  shadow-lg shadow-black/5 flex items-center justify-between"
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Image src="/assets/ryokolong.png" alt="Ryoko logo" width={150} height={150} />
                </motion.div>
                <motion.nav
                  className="hidden sm:flex items-center gap-6 text-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  {user ? (
                    // Navigation icons for logged-in users
                    <>
                      <button 
                        onClick={() => router.push('/dashboard')}
                        className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <HomeIcon className="w-5 h-5" />
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
                    </>
                  ) : (
                    // Regular navigation for non-logged-in users
                    <>
                      <motion.a
                        className="text-[#555] hover:text-[#1a1a1a] cursor-pointer"
                        onClick={() => {
                          document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        Features
                      </motion.a>
                      <motion.a
                        className="text-[#555] hover:text-[#1a1a1a] cursor-pointer"
                        onClick={() => {
                          document.getElementById('guides')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        Guides
                      </motion.a>
                      <motion.a
                        className="text-[#555] hover:text-[#1a1a1a] cursor-pointer"
                        onClick={() => {
                          document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        About
                      </motion.a>
                    </>
                  )}
                </motion.nav>
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <motion.button
                    className="h-9 px-4 text-sm font-bold  hover:text-[#ff5a58] cursor-pointer"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthOpen(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    SIGN IN
                  </motion.button>
                  <motion.button
                    className="h-9 px-4 rounded-full text-sm font-bold text-white bg-[#ff5a58] hover:bg-[#ff4a47] cursor-pointer"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthOpen(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    GET STARTED
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </motion.header>

          {/* Hero Section - Redesigned */}
          <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#ff5a58]/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#58b6ff]/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#ffd85d]/5 to-[#ff9558]/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center py-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
                {/* Left Column - Content */}
                <motion.div
                  className="space-y-8 order-1 lg:order-1"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  {/* Badge */}
                  <motion.div
                    className="inline-flex items-center mt-4 md:mt-2 lg:mt-0 px-4 py-2 bg-[#ff5a58]/10 border border-[#ff5a58]/20 rounded-full"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <div className="w-2 h-2 bg-[#ff5a58] rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-[#ff5a58]">Your Next Collaborative Trip Plannner</span>
                  </motion.div>

                  {/* Main Heading */}
                  <motion.div className="space-y-4">
                    <motion.h1
                      className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    >
                      <span className="text-dark">Plan Together</span>
                      <br />
                      <span className="bg-gradient-to-r from-[#ff5a58] to-[#ff9558] bg-clip-text text-transparent">
                        Travel Better
                      </span>
                    </motion.h1>
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  >
                    Ryoko revolutionizes group trip planning with AI-powered recommendations, 
                    real-time collaboration, and seamless expense management. 
                    Turn your travel dreams into reality now.
                  </motion.p>

                  {/* CTA Buttons */}
                  <motion.div
                    className="flex flex-col sm:flex-row gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                  >
                    <motion.button
                      className="px-8 py-4 bg-gradient-to-r from-[#ff5a58] to-[#ff9558] cursor-pointer text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthOpen(true);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Start Planning Now
                    </motion.button>
                    <motion.button
                      className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:border-[#ff5a58] hover:text-[#ff5a58] cursor-pointer transition-all duration-300"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthOpen(true);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Sign In
                    </motion.button>
                  </motion.div>

                </motion.div>

                {/* Right Column - Hero Image */}
                <motion.div
                  className="relative order-2 lg:order-2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <div className="relative">
                    {/* Main Image */}
                    <motion.div
                      className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center"
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Image 
                        src="/assets/heroimage.svg" 
                        alt="Travel planning with friends" 
                        width={600}
                        height={600}
                        priority 
                        className="w-auto h-auto max-w-full max-h-full"
                      />
                    </motion.div>

                  </div>
                </motion.div>
              </div>
            </div>

          </section>

          {/* Stats band */}
          <motion.section
            className="relative bg-[#ff5a58] text-white overflow-hidden h-[400px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            
            {/* Bottom corner image placeholders */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Image src="/assets/stats1.png" alt="decorative" width={380} height={380} className="hidden xl:block absolute -bottom-0 -left-0" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Image src="/assets/stats2.png" alt="decorative" width={380} height={380} className="hidden xl:block absolute -bottom-0 -right-0" />
            </motion.div>
            <div className="relative z-10 mx-auto max-w-6xl px-4 h-full flex items-center">
              <motion.div
                className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-center"
                variants={statsVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <motion.div
                  className="col-span-1 sm:col-span-3 text-lg md:text-2xl lg:text-3xl font-extrabold tracking-tight mb-2"
                  variants={itemVariants}
                >
                  THE NEXT TRAVEL PLANNING APP BUILT FOR FRIENDS AND FAMILIES
                </motion.div>
                <motion.div variants={itemVariants}>
                  <div className="text-4xl md:text-5xl font-extrabold"><CountUp end={200} suffix="+" /></div>
                  <div className="text-xs md:text-sm opacity-90">Trips Planned</div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <div className="text-4xl md:text-5xl font-extrabold"><CountUp end={30} suffix="+" /></div>
                  <div className="text-xs md:text-sm opacity-90">Countries Explored</div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <div className="text-4xl md:text-5xl font-extrabold"><CountUp end={1000} suffix="+" /></div>
                  <div className="text-xs md:text-sm opacity-90">Monthly Users</div>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          {/* Why plan with us */}
          <motion.section
            id="features"
            className="bg-[#f7f7f7]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto max-w-6xl px-4 py-12">
              <motion.h2
                className="text-2xl sm:text-3xl font-extrabold text-center mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                Why plan <span className="text-[#ff5a58] italic underline decoration-4 decoration-[#ff5a58] underline-offset-4">with us</span>
              </motion.h2>
              <motion.div
                className="grid md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  {
                    title: "ALL-IN-ONE TRIP PLANNING HUB",
                    desc: "Bring itineraries, budgets, and bookings into one organized place.",
                    bg: "bg-[#ffd85d]",
                    img: "/assets/star.png",
                    darkText: true,
                    textColor: "text-[#9F8B39]",
                  },
                  {
                    title: "REAL TIME COLLABORATION",
                    desc: "Vote, chat, and coordinate with your group in seconds.",
                    bg: "bg-[#58b6ff]",
                    img: "/assets/news.png",
                    darkText: false,
                    textColor: "text-[#22668D]",
                  },
                  {
                    title: "DESIGNED FOR THE FULL EXPERIENCE",
                    desc: "From planning to memory boards after the trip — we've got it.",
                    bg: "bg-[#ff9558]",
                    img: "/assets/crown.png",
                    darkText: false,
                    textColor: "text-[#9C572D]",
                  },
                ].map((card) => (
                  <motion.div
                    key={card.title}
                    className="group [perspective:1000px]"
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <div className={`relative h-100 rounded-xl ${card.bg} transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]`}>
                      {/* Front */}
                      <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center gap-3 ${card.textColor} [backface-visibility:hidden]`}>
                        <Image src={card.img} alt="feature" width={140} height={140} />
                        <div className="text-2xl font-bold text-center">{card.title}</div>
                      </div>
                      {/* Back */}
                      <div className={`absolute inset-0 p-6 ${card.textColor} [transform:rotateY(180deg)] [backface-visibility:hidden] flex items-center justify-center`}>
                        <p className={`text-xl text-center max-w-[18rem]`}>
                          {card.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* Top guides */}
          <motion.section
            id="guides"
            className="bg-white"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto max-w-6xl px-4 py-12">
              <motion.div
                className="flex items-end justify-between mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h3 className="text-xl sm:text-2xl font-extrabold">
                  <span className="text-[#ff5a58] italic underline decoration-4 decoration-[#ff5a58] underline-offset-6">Top guides</span> from users
                </h3>
              </motion.div>
              <motion.div
                className="grid md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  { title: "Explore Ancient Temples and Modern Charm", tag: "Kyoto, Japan" },
                  { title: "Wine Tasting and Rolling Hills Adventure", tag: "Tuscany, Italy" },
                  { title: "City Lights and Cultural Highlights", tag: "New York City, USA" },
                  { title: "Explore Ancient Temples and Modern Charm1", tag: "Kyoto, Japan" },
                  { title: "Wine Tasting and Rolling Hills Adventure2", tag: "Tuscany, Italy" },
                  { title: "City Lights and Cultural Highlights3", tag: "New York City, USA" },
                ].map((card) => (
                  <motion.article
                    key={card.title}
                    className="rounded-xl border border-[#eee] overflow-hidden bg-white"
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <div className="h-44 bg-[#ddd]" />
                    <div className="p-4">
                      <h4 className="font-semibold mb-2">{card.title}</h4>
                      <div className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full bg-[#ff5757] text-white">
                        <span><MapPin className="w-4 h-4" /></span>
                        <span>{card.tag}</span>
                      </div>
                      <p className="text-xs text-[#555] mt-3 line-clamp-3">
                        Sample description text for this guide. Replace with real content later.
                      </p>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* Animated Banner */}
          <motion.section
            className="bg-[#ffd85d] h-[100px] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="flex items-center gap-4 whitespace-nowrap"
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{
                duration: 40,
                ease: "linear",
                repeat: Infinity,
                repeatType: "loop",
              }}
            >
              <Image src="/assets/ryoko.png" alt="Ryoko logo" width={60} height={60} />
              <span className="text-white text-2xl md:text-3xl font-extrabold">
                Plan your next adventure with{" "}
                <span className="text-[#ff5a58]">Ryoko</span> now
              </span>

              <Image src="/assets/ryoko.png" alt="Ryoko logo" width={60} height={60} />
              <span className="text-white text-2xl md:text-3xl font-extrabold">
                Plan your next adventure with{" "}
                <span className="text-[#ff5a58]">Ryoko</span> now
              </span>
              
              <Image src="/assets/ryoko.png" alt="Ryoko logo" width={60} height={60} />
              <span className="text-white text-2xl md:text-3xl font-extrabold">
                Plan your next adventure with{" "}
                <span className="text-[#ff5a58]">Ryoko</span> now
              </span>

              <Image src="/assets/ryoko.png" alt="Ryoko logo" width={60} height={60} />
              <span className="text-white text-2xl md:text-3xl font-extrabold">
                Plan your next adventure with{" "}
                <span className="text-[#ff5a58]">Ryoko</span> now
              </span>

              <Image src="/assets/ryoko.png" alt="Ryoko logo" width={60} height={60} />
              <span className="text-white text-2xl md:text-3xl font-extrabold">
                Plan your next adventure with{" "}
                <span className="text-[#ff5a58]">Ryoko</span> now
              </span>

              <Image src="/assets/ryoko.png" alt="Ryoko logo" width={60} height={60} />
              <span className="text-white text-2xl md:text-3xl font-extrabold">
                Plan your next adventure with{" "}
                <span className="text-[#ff5a58]">Ryoko</span> now
              </span>
            </motion.div>
          </motion.section>

          {/* Footer */}
          <motion.footer
            id="about"
            className="bg-[#ff5757]"
            style={{ color: "#ffffff" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-3 gap-8">
              <motion.div
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className=" text-xl font-extrabold tracking-tight">About Ryoko</div>
                <p className="text-sm mt-3">
                  Ryoko is a collaborative travel planning platform built for group travelers. From trip
                  ideation to budgeting and post-trip memories, keep everything in one place.
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <p className="text-sm mt-9">
                  We help keep everything organized in one place so you can focus on making memories, not
                  managing logistics.
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="mt-8 text-lg font-semibold mb-2 flex items-center gap-2 cursor-pointer" onClick={openSignUp}>
                  Sign Up Now <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            </div>
            <div className="border-t border-[#ffd8d7]">
              <div className="mx-auto max-w-6xl px-4 py-4 text-xs flex items-center justify-between">
                <span>© 2025 | Capstone Project</span>
              </div>
            </div>
          </motion.footer>
        </motion.div>
      )}
    </PublicRoute>
  );
}
