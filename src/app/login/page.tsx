"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type UserProfile = {
  user: {
    userId: number;
    email: string;
    role: string;
  };
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = (await res.json()) as UserProfile;
          if (data.user) {
            router.replace(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { error?: string; user: { role: string } };

      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      // Successful login
      router.refresh();
      router.push(data.user.role === "ADMIN" ? "/admin" : nextParam);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-white">
      {/* Left Column: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-[380px]">
          {/* Brand Header */}
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-[7px] w-[7px] rounded-full bg-[#533afd]" />
              <span className="landing-nav-brand">SecureBank NG</span>
            </Link>
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
              Sign in to your account
            </h1>
            <p className="text-[15px] font-[300] leading-[1.4] text-[#64748d]">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {/* Error Alert Display */}
          {error && (
            <div className="mb-6 rounded-md bg-[#fef2f1] border border-[#ea2261]/20 p-4">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#ea2261] text-[13px] mt-[2px]">!</span>
                <span className="text-[13px] text-[#ea2261]">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[13px] font-[400] text-[#273951]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-[400] text-[#273951]">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 pr-10 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#0d253d] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="landing-btn-primary w-full mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-[13px] text-[#64748d]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#533afd] hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-16">
            <p className="text-[11px] font-[300] text-[#64748d]">
              Secured with robust cryptographic session tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Gradient Graphic */}
      <div className="relative hidden lg:block lg:w-1/2">
        <Image
          src="/mesh-hero.png"
          alt="Atmospheric gradient mesh"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        {/* Subtle inner shadow/border to separate the white and graphic softly if needed */}
        <div className="absolute inset-0 border-l border-black/5" />
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
          <span className="text-[13px] text-[#64748d]">Loading...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
