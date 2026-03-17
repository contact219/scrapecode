import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function ScrapeCodeLogo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      <circle cx="28" cy="28" r="27" fill="url(#glowGrad)" />
      <circle cx="28" cy="28" r="27" stroke="url(#logoGrad)" strokeWidth="0.6" strokeOpacity="0.5" />

      {/* Magnifying glass lens */}
      <circle cx="23" cy="22" r="12" stroke="url(#logoGrad)" strokeWidth="2.5" filter="url(#glow)" />

      {/* Handle */}
      <line x1="32" y1="31" x2="41" y2="40" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />

      {/* Code brackets inside lens: < / > */}
      {/* Left angle bracket */}
      <polyline points="17,17 13,22 17,27" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glow)" />
      {/* Slash */}
      <line x1="22" y1="16" x2="20" y2="28" stroke="url(#logoGrad)" strokeWidth="1.8" strokeLinecap="round" filter="url(#glow)" />
      {/* Right angle bracket */}
      <polyline points="25,17 29,22 25,27" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glow)" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login failed");
        return;
      }
      const { token } = await res.json();
      login(token);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 60% 20%, #0e1033 0%, #070a18 55%, #040710 100%)" }}>

      {/* Background ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #6366f140 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #22d3ee30 0%, transparent 70%)", filter: "blur(70px)" }} />
        <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa25 0%, transparent 70%)", filter: "blur(50px)" }} />

        {/* Subtle grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#818cf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-10 gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full opacity-40"
              style={{ background: "radial-gradient(circle, #6366f160 0%, transparent 70%)", filter: "blur(20px)", transform: "scale(1.5)" }} />
            <ScrapeCodeLogo size={64} />
          </div>
          <div className="text-center space-y-1.5">
            <h1 className="text-[28px] font-bold tracking-tight"
              style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 40%, #67e8f9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ScrapeCode
            </h1>
            <p style={{ color: "#94a3b8" }} className="text-sm tracking-wide">Automated job intelligence platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-[1px]"
          style={{ background: "linear-gradient(135deg, #6366f140 0%, #22d3ee20 100%)" }}>
          <div className="rounded-2xl p-8 space-y-6"
            style={{ background: "rgba(10, 14, 30, 0.85)", backdropFilter: "blur(24px)" }}>

            <div>
              <p className="text-[15px] font-semibold text-slate-200 mb-0.5">Welcome back</p>
              <p className="text-sm" style={{ color: "#64748b" }}>Enter your password to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 pr-11 rounded-xl text-sm border-0"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      color: "#e2e8f0",
                      outline: "none",
                    }}
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#475569" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium px-3 py-2.5 rounded-lg"
                  style={{ color: "#fca5a5", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading || !password
                    ? "rgba(99,102,241,0.4)"
                    : "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #22d3ee 150%)",
                  color: "#fff",
                  boxShadow: loading || !password ? "none" : "0 0 30px rgba(99,102,241,0.4), 0 4px 15px rgba(99,102,241,0.25)",
                  transform: loading || !password ? "none" : "translateY(0px)",
                }}
                onMouseEnter={e => {
                  if (!loading && password) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0px)";
                }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#334155" }}>
          ScrapeCode · Secure Access
        </p>
      </div>
    </div>
  );
}
