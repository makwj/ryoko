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
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

export default function AuthModal({ open, mode, onClose, onModeChange }: AuthModalProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Check for password reset token in URL when modal opens
  useEffect(() => {
    if (open) {
      // Check for Supabase password reset hash fragment
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        // User clicked password reset link from email
        onModeChange("reset-password");
        // Clear hash from URL (but keep it for Supabase session)
        // We'll clear it after password is reset
      }
      
      // Also check query params (fallback)
      const token = searchParams?.get('token');
      const type = searchParams?.get('type');
      if (token && type === 'recovery') {
        onModeChange("reset-password");
      }
    }
  }, [open, searchParams, onModeChange]);

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

  // Handle forgot password - send reset email
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.email) {
        setError("Please enter your email address");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success("Password reset link sent! Please check your email.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset - update password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      toast.success("Password reset successful! Redirecting to dashboard...");
      
      // Clear URL hash/params
      window.history.replaceState({}, '', window.location.pathname);
      
      // Close modal and redirect to dashboard (user is already logged in after clicking reset link)
      onClose();
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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
          // Check if user is banned
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_banned')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('Error checking ban status:', profileError);
          }

          if (profile?.is_banned) {
            // Sign out the user immediately
            await supabase.auth.signOut();
            const banMessage = "Your account has been banned. Please contact support if you believe this is an error.";
            setError(banMessage);
            toast.error(banMessage);
            return;
          }

          toast.success("Login successful!");
          onClose();
          // Don't redirect here - let the auth state change trigger redirect in page.tsx
          // This ensures the auth context is fully updated before navigation
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

  const getTitle = () => {
    if (mode === "forgot-password") return "Reset Password";
    if (mode === "reset-password") return "Set New Password";
    return mode === "login" ? "Login" : "Create account";
  };

  const getPrimaryCta = () => {
    if (mode === "forgot-password") return "Send Reset Link";
    if (mode === "reset-password") return "Reset Password";
    return mode === "login" ? "Continue" : "Create account";
  };

  const getSwapPrompt = () => {
    if (mode === "forgot-password") {
      return (
        <span>
          Remember your password?{" "}
          <span 
            className="text-[#ff5a58] cursor-pointer hover:underline"
            onClick={() => {
              onModeChange("login");
              setResetEmailSent(false);
              setFormData({ name: "", email: "", password: "", confirmPassword: "" });
            }}
          >
            Sign In
          </span>
        </span>
      );
    }
    if (mode === "reset-password") {
      return (
        <span>
          Remember your password?{" "}
          <span 
            className="text-[#ff5a58] cursor-pointer hover:underline"
            onClick={() => {
              onModeChange("login");
              setFormData({ name: "", email: "", password: "", confirmPassword: "" });
            }}
          >
            Sign In
          </span>
        </span>
      );
    }
    return mode === "login" ? (
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
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl overflow-hidden p-0 border-0 bg-transparent">
        <DialogHeader className="sr-only">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
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

              <h2 className="text-2xl font-extrabold text-center mb-6">{getTitle()}</h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {resetEmailSent && mode === "forgot-password" && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                    Password reset link has been sent to {formData.email}. Please check your email and click the link to reset your password.
                  </div>
                )}

                <form onSubmit={
                  mode === "forgot-password" ? handleForgotPassword :
                  mode === "reset-password" ? handleResetPassword :
                  handleSubmit
                } className="space-y-4">
                  {/* Back button for forgot/reset modes */}
                  {(mode === "forgot-password" || mode === "reset-password") && (
                    <button
                      type="button"
                      onClick={() => {
                        onModeChange("login");
                        setResetEmailSent(false);
                        setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                      }}
                      className="flex items-center gap-2 text-sm text-[#666] hover:text-[#ff5a58] mb-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </button>
                  )}

                  {/* Name field - only for register */}
                  {mode === "register" && (
                    <div>
                      <Label className="text-xs font-medium text-[#666]">NAME</Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2 focus-visible:ring-offset-0"
                        placeholder="Ryoko"
                        required
                      />
                    </div>
                  )}

                  {/* Email field - for login, register, and forgot-password */}
                  {(mode === "login" || mode === "register" || mode === "forgot-password") && (
                    <div>
                      <Label className="text-xs font-medium text-[#666]">EMAIL</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2 focus-visible:ring-offset-0"
                        placeholder="ryoko@email.com"
                        required
                      />
                    </div>
                  )}

                  {/* Password field - for login, register, and reset-password */}
                  {(mode === "login" || mode === "register" || mode === "reset-password") && (
                    <div>
                      <Label className="text-xs font-medium text-[#666]">PASSWORD</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2 focus-visible:ring-offset-0"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}

                  {/* Confirm Password - for register and reset-password */}
                  {(mode === "register" || mode === "reset-password") && (
                    <div>
                      <Label className="text-xs font-medium text-[#666]">CONFIRM PASSWORD</Label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className="mt-1 w-full h-11 focus-visible:ring-[#ff5a58] focus-visible:ring-2 focus-visible:ring-offset-0"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}

                  {/* Forgot Password link - only for login */}
                  {mode === "login" && (
                    <div className="flex justify-end -mt-1">
                      <Button 
                        type="button"
                        onClick={() => {
                          onModeChange("forgot-password");
                          setFormData({ name: "", email: formData.email, password: "", confirmPassword: "" });
                        }}
                        className="bg-transparent text-xs text-[#777] hover:bg-transparent cursor-pointer p-0 h-auto"
                      >
                        Forgot Password?
                      </Button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || (mode === "forgot-password" && resetEmailSent)}
                    className="cursor-pointer w-full h-11 bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold disabled:opacity-50"
                  >
                    {loading ? "Loading..." : getPrimaryCta()}
                    <span className="ml-2">›</span>
                  </Button>

                  <div className="text-center text-xs text-[#666] mt-2">{getSwapPrompt()}</div>
                </form>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}


