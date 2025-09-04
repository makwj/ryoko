"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";

type AuthMode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

export default function AuthModal({ open, mode, onClose, onModeChange }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return;
        }

        // Register user
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Create profile entry
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                name: formData.name,
                email: formData.email,
              }
            ]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          toast.success("Registration successful! Please check your email to verify your account.");
          onClose();
          // Don't redirect for registration - let user verify email first
        }
      } else {
        // Login user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.user) {
          toast.success("Login successful!");
          onClose();
          // Add delay before redirect to allow toast to display
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const title = mode === "login" ? "Login" : "Create account";
  const primaryCta = mode === "login" ? "Continue" : "Create account";
  const swapPrompt = mode === "login" ? (
    <span>
      Don&apos;t have an account?{" "}
      <span 
        className="text-[#ff5a58] cursor-pointer hover:underline"
        onClick={() => onModeChange("register")}
      >
        Sign Up
      </span>
    </span>
  ) : (
    <span>
      Already have an account?{" "}
      <span 
        className="text-[#ff5a58] cursor-pointer hover:underline"
        onClick={() => onModeChange("login")}
      >
        Sign In
      </span>
    </span>
  );

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div 
        className="absolute inset-0 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div 
          className="w-full max-w-3xl bg-white rounded-[28px] shadow-2xl overflow-hidden relative"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ 
            duration: 0.4,
            ease: "easeOut"
          }}
        >
          <motion.button
            aria-label="Close"
            className="cursor-pointer absolute right-4 top-4 h-9 w-9 rounded-full flex items-center justify-center text-[#888] hover:bg-[#f3f3f3]"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            ×
          </motion.button>
          <div className="grid md:grid-cols-[1fr_1.3fr]">
            {/* Left visual panel */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0">
                <Image src="/assets/modalbg.png" alt="decorative" className="h-full w-full object-cover" fill />
              </div>
            </div>

            {/* Right form panel */}
            <div className="px-8 py-10">
              <div className="mx-auto max-w-md">
                <div className="flex flex-col items-center mb-6">
                  <Image src="/assets/ryokosquare.png" alt="Ryoko logo" className="h-40 w-40" width={160} height={160} />
                </div>

                <h2 className="text-2xl font-extrabold text-center mb-6">{title}</h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "register" && (
                    <div>
                      <label className="text-xs font-medium text-[#666]">NAME</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-[#666]">EMAIL</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                      placeholder="johndoe@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#666]">PASSWORD</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 pr-10 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  {mode === "register" && (
                    <div>
                      <label className="text-xs font-medium text-[#666]">CONFIRM PASSWORD</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="flex justify-end -mt-1">
                      <button className="text-xs text-[#777] hover:text-[#1a1a1a] cursor-pointer" type="button">
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-[#ff5a58] hover:bg-[#ff4a47] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? "Loading..." : primaryCta}
                    <span>›</span>
                  </button>

                  <div className="text-center text-xs text-[#666] mt-2">{swapPrompt}</div>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}


