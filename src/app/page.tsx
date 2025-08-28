"use client";
import Image from "next/image";
import { useState } from "react";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  return (
    <div className="font-sans min-h-screen bg-white text-[#1a1a1a]">
      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-[#eee]">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/next.svg" alt="Ryoko" width={24} height={24} className="opacity-0" />
            <span className="text-[#ff5a58] text-xl font-extrabold tracking-tight">RYOKO</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a className="text-[#555] hover:text-[#1a1a1a]" href="#features">Features</a>
            <a className="text-[#555] hover:text-[#1a1a1a]" href="#guides">Guides</a>
            <a className="text-[#555] hover:text-[#1a1a1a]" href="#about">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              className="h-9 px-4 rounded-full text-sm font-medium border border-[#e5e5e5] hover:bg-[#f7f7f7]"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
            >
              Sign in
            </button>
            <button
              className="h-9 px-4 rounded-full text-sm font-semibold text-white bg-[#ff5a58] hover:bg-[#ff4a47]"
              onClick={() => {
                setAuthMode("register");
                setAuthOpen(true);
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-20%,#ffd8d7,transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-8 relative">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-[#ff5a58]">Plan together
                <br />
                <span className="text-[#1a1a1a]">travel better</span>
              </h1>
              <p className="mt-4 text-[#555] max-w-prose">
                Ryoko revolutionizes group trip planning with AI-powered recommendations, real-time collaboration,
                and seamless expense management. Turn your travel dreams into reality now.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  className="h-11 px-5 rounded-full text-sm font-semibold text-white bg-[#ff5a58] hover:bg-[#ff4a47]"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthOpen(true);
                  }}
                >
                  Get started
                </button>
                <button
                  className="h-11 px-5 rounded-full text-sm font-medium border border-[#e5e5e5] hover:bg-[#f7f7f7]"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }}
                >
                  Sign in
                </button>
              </div>
            </div>
            <div className="relative h-[320px] md:h-[380px]">
              {/* Polaroid-style collage (placeholder images) */}
              <div className="absolute left-2 top-4 rotate-[-12deg] w-48 sm:w-56 bg-white shadow-xl p-2">
                <div className="aspect-[4/3] bg-[#ddd] rounded" />
              </div>
              <div className="absolute left-40 sm:left-52 top-14 rotate-[8deg] w-48 sm:w-56 bg-white shadow-xl p-2">
                <div className="aspect-[4/3] bg-[#ddd] rounded" />
              </div>
              <div className="absolute right-6 bottom-0 rotate-[12deg] w-52 sm:w-64 bg-white shadow-xl p-2">
                <div className="aspect-[4/3] bg-[#ddd] rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-[#ff5a58] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-extrabold">200+</div>
            <div className="text-sm opacity-90">Trips Planned</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">30+</div>
            <div className="text-sm opacity-90">Countries Explored</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">1000+</div>
            <div className="text-sm opacity-90">Monthly Users</div>
          </div>
        </div>
      </section>

      {/* Why plan with us */}
      <section id="features" className="bg-[#f7f7f7]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">Why plan <span className="text-[#ff5a58]">with us</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl p-6 bg-[#ffd85d]">
              <div className="text-lg font-bold mb-2">All-in-one trip planning hub</div>
              <p className="text-sm text-[#444]">Bring itineraries, budgets, and bookings into one organized place.</p>
            </div>
            <div className="rounded-xl p-6 bg-[#58b6ff] text-white">
              <div className="text-lg font-bold mb-2">Real-time collaboration</div>
              <p className="text-sm opacity-95">Vote, chat, and coordinate with your group in seconds.</p>
            </div>
            <div className="rounded-xl p-6 bg-[#ff9558] text-white">
              <div className="text-lg font-bold mb-2">Designed for the full experience</div>
              <p className="text-sm opacity-95">From planning to memory boards after the trip — we’ve got it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top guides */}
      <section id="guides" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-end justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-extrabold"><span className="text-[#ff5a58]">Top guides</span> from users</h3>
            <div className="flex gap-2">
              <button className="h-8 w-8 rounded-full border border-[#e5e5e5]">←</button>
              <button className="h-8 w-8 rounded-full border border-[#e5e5e5]">→</button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Explore Ancient Temples and Modern Charm", tag: "Kyoto, Japan" },
              { title: "Wine Tasting and Rolling Hills Adventure", tag: "Tuscany, Italy" },
              { title: "City Lights and Cultural Highlights", tag: "New York City, USA" },
            ].map((card) => (
              <article key={card.title} className="rounded-xl border border-[#eee] overflow-hidden bg-white">
                <div className="h-44 bg-[#ddd]" />
                <div className="p-4">
                  <h4 className="font-semibold mb-2">{card.title}</h4>
                  <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#eee] text-[#333]">
                    <span>•</span>
                    <span>{card.tag}</span>
                  </div>
                  <p className="text-xs text-[#555] mt-3 line-clamp-3">
                    Sample description text for this guide. Replace with real content later.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-[#ffefee]">
        <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-[#ff5a58] text-xl font-extrabold tracking-tight">RYOKO</div>
            <p className="text-sm text-[#555] mt-3">
              Ryoko is a collaborative travel planning platform built for group travelers. From trip
              ideation to budgeting and post-trip memories, keep everything in one place.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Company</div>
            <ul className="space-y-2 text-sm text-[#555]">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Get started</div>
            <button className="h-10 px-4 rounded-full text-sm font-semibold text-white bg-[#ff5a58] hover:bg-[#ff4a47]">
              Sign Up Now
            </button>
          </div>
        </div>
        <div className="border-t border-[#ffd8d7]">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-[#777] flex items-center justify-between">
            <span>© 2025 | Capstone Project</span>
            <span>RYOKO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
