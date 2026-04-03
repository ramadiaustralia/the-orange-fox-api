"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedBackground />
      </div>

      {/* Animated Orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(212,105,42,0.12) 0%, transparent 70%)",
          animation: "orbFloat 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full -top-20 -left-20 pointer-events-none opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(212,105,42,0.08) 0%, transparent 70%)",
          animation: "orbFloat 18s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute w-[250px] h-[250px] rounded-full -bottom-16 -right-16 pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(212,105,42,0.1) 0%, transparent 70%)",
          animation: "orbFloat 22s ease-in-out infinite",
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-orange/30 pointer-events-none"
          style={{
            top: `${15 + i * 14}%`,
            left: `${10 + i * 15}%`,
            animation: `twinkle ${2 + i * 0.7}s ease-in-out infinite ${i * 0.5}s, heroParticleFloat ${8 + i * 3}s ease-in-out infinite ${i * 1.2}s`,
          }}
        />
      ))}

      {/* Corner accents */}
      <div
        className="absolute top-8 left-8 w-16 h-16 pointer-events-none opacity-10 border-l border-t border-orange/30"
        style={{ animation: "glow-pulse 4s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-8 right-8 w-16 h-16 pointer-events-none opacity-10 border-r border-b border-orange/30"
        style={{ animation: "glow-pulse 4s ease-in-out infinite 2s" }}
      />

      {/* Horizontal glow line */}
      <div
        className="absolute top-1/2 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(212,105,42,0.06) 30%, rgba(212,105,42,0.1) 50%, rgba(212,105,42,0.06) 70%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 w-full max-w-md px-6 transition-all duration-1000 ease-out ${
          revealed ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-8 blur-sm"
        }`}
      >
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 backdrop-blur-sm">
            <span
              className="w-1.5 h-1.5 rounded-full bg-orange"
              style={{ animation: "glow-pulse 2s ease-in-out infinite" }}
            />
            <span className="text-[0.65rem] uppercase tracking-[3px] text-white/60 font-heading">
              Company Website Portal
            </span>
          </div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.png"
            alt="The Orange Fox"
            width={180}
            height={180}
            className="drop-shadow-[0_0_40px_rgba(212,105,42,0.25)]"
            style={{ animation: "float 4s ease-in-out infinite" }}
            priority
          />
        </div>

        {/* Divider */}
        <div className="relative w-20 h-px mx-auto my-5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange to-transparent" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-orange to-transparent opacity-60"
            style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
          />
        </div>

        {/* Brand text */}
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-[0.7rem] tracking-[2px] text-orange uppercase mb-1">
            THE ORANGE FOX
          </h1>
          <p className="text-sm text-white/40">Content Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="font-heading text-lg font-semibold text-white mb-1">
            Welcome to our Fox Team
          </h2>
          <p className="text-sm text-white/50 mb-6">Sign in with your email to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-orange focus:ring-2 focus:ring-orange/20 placeholder-white/30"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-orange focus:ring-2 focus:ring-orange/20 placeholder-white/30 pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full mt-2 bg-orange hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-orange/20 hover:shadow-orange/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          &copy; 2026 The Orange Fox. All rights reserved.
        </p>
      </div>
    </div>
  );
}
