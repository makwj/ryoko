"use client";

import { useEffect } from "react";

type AuthMode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
};

export default function AuthModal({ open, mode, onClose }: AuthModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = mode === "login" ? "Login" : "Create account";
  const primaryCta = mode === "login" ? "Continue" : "Create account";
  const swapPrompt = mode === "login" ? (
    <span>
      Don’t have an account? <span className="text-[#ff5a58]">Sign Up</span>
    </span>
  ) : (
    <span>
      Already have an account? <span className="text-[#ff5a58]">Sign In</span>
    </span>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-[28px] shadow-2xl overflow-hidden relative">
          <button
            aria-label="Close"
            className="absolute right-4 top-4 h-9 w-9 rounded-full flex items-center justify-center text-[#888] hover:bg-[#f3f3f3]"
            onClick={onClose}
          >
            ×
          </button>
          <div className="grid md:grid-cols-[1fr_1.3fr]">
            {/* Left visual panel */}
            <div className="hidden md:block bg-[#0d4060] p-6">
              <div className="h-full w-full rounded-2xl bg-[repeating-linear-gradient(45deg,_#ff6b6b_0,_#ff6b6b_12px,_transparent_12px,_transparent_32px)] opacity-90" />
            </div>

            {/* Right form panel */}
            <div className="px-8 py-10">
              <div className="mx-auto max-w-md">
                <div className="flex flex-col items-center mb-6">
                  <div className="h-16 w-16 rounded-xl bg-[#ff5a58]" />
                  <div className="mt-3 text-[#ff5a58] text-2xl font-extrabold tracking-wider">
                    RYOKO
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold text-center mb-6">{title}</h2>

                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-4"
                >
                  {mode === "register" && (
                    <div>
                      <label className="text-xs font-medium text-[#666]">NAME</label>
                      <input
                        type="text"
                        className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                        placeholder="John Doe"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-[#666]">EMAIL</label>
                    <input
                      type="email"
                      className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                      placeholder="johndoe@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#666]">PASSWORD</label>
                    <div className="relative">
                      <input
                        type="password"
                        className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 pr-10 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                        placeholder="••••••••"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb]">👁️</span>
                    </div>
                  </div>
                  {mode === "register" && (
                    <div>
                      <label className="text-xs font-medium text-[#666]">CONFIRM PASSWORD</label>
                      <input
                        type="password"
                        className="mt-1 w-full h-11 rounded-xl border border-[#e5e5e5] px-3 outline-none focus:ring-2 focus:ring-[#ffd8d7]"
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="flex justify-end -mt-1">
                      <button className="text-xs text-[#777] hover:text-[#1a1a1a]" type="button">
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    className="w-full h-11 rounded-xl border border-[#e5e5e5] bg-white hover:bg-[#f8f8f8] flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="text-lg">G</span>
                    Log In with Google
                  </button>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold flex items-center justify-center gap-2"
                  >
                    {primaryCta}
                    <span>›</span>
                  </button>

                  <div className="text-center text-xs text-[#666] mt-2">{swapPrompt}</div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


