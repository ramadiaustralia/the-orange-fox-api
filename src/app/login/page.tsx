"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark via-dark-soft to-charcoal relative overflow-hidden">
      {/* === Canvas Particle Animation === */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedBackground />
      </div>

      {/* === Frontend Hero Decorative Elements === */}
      {/* Main animated orb */}
      <div className="absolute w-[500px] h-[500px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(212,105,42,0.12) 0%,transparent 70%)', animation: 'orbFloat 25s ease-in-out infinite' }} />
      {/* Secondary orb top-left */}
      <div className="absolute w-[300px] h-[300px] rounded-full -top-20 -left-20 pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle,rgba(212,105,42,0.08) 0%,transparent 70%)', animation: 'orbFloat 18s ease-in-out infinite reverse' }} />
      {/* Tertiary orb bottom-right */}
      <div className="absolute w-[250px] h-[250px] rounded-full -bottom-16 -right-16 pointer-events-none opacity-30" style={{ background: 'radial-gradient(circle,rgba(212,105,42,0.1) 0%,transparent 70%)', animation: 'orbFloat 22s ease-in-out infinite' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full bg-orange/30 pointer-events-none" style={{
          top: `${15 + i * 14}%`, left: `${10 + i * 15}%`,
          animation: `twinkle ${2 + i * 0.7}s ease-in-out infinite ${i * 0.5}s, float ${8 + i * 3}s ease-in-out infinite ${i * 1.2}s`
        }} />
      ))}

      {/* Corner accents */}
      <div className="absolute top-8 left-8 w-16 h-16 pointer-events-none opacity-10 border-l border-t border-orange/30" style={{ animation: 'glow-pulse 4s ease-in-out infinite' }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 pointer-events-none opacity-10 border-r border-b border-orange/30" style={{ animation: 'glow-pulse 4s ease-in-out infinite 2s' }} />

      {/* Horizontal glow line */}
      <div className="absolute top-1/2 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212,105,42,0.06) 30%, rgba(212,105,42,0.1) 50%, rgba(212,105,42,0.06) 70%, transparent 100%)' }} />

      {/* Diagonal accent lines */}
      <div className="absolute top-0 right-[15%] w-px h-32 pointer-events-none opacity-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,105,42,0.5), transparent)' }} />
      <div className="absolute bottom-0 left-[20%] w-px h-24 pointer-events-none opacity-10" style={{ background: 'linear-gradient(to top, transparent, rgba(212,105,42,0.4), transparent)' }} />

      {/* === Login Content === */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="animate-fade-in">
          {/* Badge - like frontend hero badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-orange" style={{ animation: 'glow-pulse 2s ease-in-out infinite' }} />
              <span className="text-[0.65rem] uppercase tracking-[3px] text-white/60 font-heading">Admin Portal</span>
            </div>
          </div>

          {/* Logo - floating like frontend hero */}
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="The Orange Fox"
              width={180}
              height={180}
              className="drop-shadow-[0_0_40px_rgba(212,105,42,0.25)]"
              style={{ animation: 'float 4s ease-in-out infinite' }}
              priority
            />
          </div>

          {/* Animated divider - from frontend hero */}
          <div className="relative w-20 h-px mx-auto my-5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange to-transparent opacity-60" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }} />
          </div>

          {/* Brand text - matching frontend Navbar style */}
          <div className="text-center mb-8">
            <h1 className="font-heading font-bold text-[0.7rem] tracking-[2px] text-orange uppercase mb-1">THE ORANGE FOX</h1>
            <p className="text-sm text-white/40">Content Management System</p>
          </div>

          {/* Login Card - WHITE center card on dark background */}
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
            <h2 className="font-heading text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to manage your content</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-orange focus:ring-2 focus:ring-orange/20 placeholder-gray-400"
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-orange focus:ring-2 focus:ring-orange/20 placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full mt-2 bg-gradient-to-r from-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-orange/20 hover:shadow-orange/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                {/* Shimmer effect on hover - from frontend CTA */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          </div>

          <p className="text-center text-white/30 text-xs mt-6">
            &copy; 2026 The Orange Fox. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
