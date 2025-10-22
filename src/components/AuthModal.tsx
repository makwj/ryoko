/**
 * AuthModal Component
 * 
 * Modal dialog for user authentication (login and registration).
 * Handles user signup with email verification and login with error handling.
 * Features form validation, password confirmation, and automatic mode switching.
 * Integrates with Supabase Auth for secure authentication.
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

        // Check if user already exists by looking in profiles table
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', formData.email)
          .single();

        if (existingProfile && !profileCheckError) {
          setError("An account with this email already exists. Please sign in instead.");
          // Automatically switch to login mode after a short delay
          setTimeout(() => {
            onModeChange("login");
            setError(null);
          }, 2000);
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

        if (error) {
          // Handle specific Supabase errors
          if (error.message.includes("User already registered") || 
              error.message.includes("already been registered") ||
              error.message.includes("already exists")) {
            setError("An account with this email already exists. Please sign in instead.");
            // Automatically switch to login mode after a short delay
            setTimeout(() => {
              onModeChange("login");
              setError(null);
            }, 2000);
            return;
          }
          throw error;
        }

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl overflow-hidden p-0 border-0 bg-transparent">
        <div className="grid md:grid-cols-[1fr_1.3fr]">
          {/* Left visual panel */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0">
              <Image src="/assets/modalbg.png" alt="decorative" className="h-full w-full object-cover" fill />
            </div>
          </div>

          {/* Right form panel */}
          <div className="px-8 py-10 bg-[#EEEEEE]">
            <div className="mx-auto max-w-md">
              <div className="flex flex-col items-center">
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
                      <Label className="text-xs font-medium text-[#666]">NAME</Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                        placeholder="Ryoko"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs font-medium text-[#666]">EMAIL</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                      placeholder="ryoko@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-[#666]">PASSWORD</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {mode === "register" && (
                    <div>
                      <Label className="text-xs font-medium text-[#666]">CONFIRM PASSWORD</Label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="flex justify-end -mt-1">
                      <Button className="bg-transparent text-xs text-[#777] hover:bg-transparent cursor-pointer p-0 h-auto" type="button">
                        Forgot Password?
                      </Button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer w-full h-11 bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold"
                  >
                    {loading ? "Loading..." : primaryCta}
                    <span className="ml-2">›</span>
                  </Button>

                  <div className="text-center text-xs text-[#666] mt-2">{swapPrompt}</div>
                </form>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}


