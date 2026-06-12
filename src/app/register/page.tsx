"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.replace(
              data.user.role === "ADMIN" ? "/admin" : data.user.role === "TELLER" ? "/teller" : "/dashboard",
            );
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
    setSuccess(null);
    setLoading(true);

    if (!email || !password || !transactionPin || !firstName || !lastName || !dateOfBirth) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      setError("Transaction PIN must be exactly 4 digits.");
      setLoading(false);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      setError("Date of birth must use YYYY-MM-DD format.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          transactionPin,
          firstName,
          lastName,
          phone: phone || undefined,
          address: address || undefined,
          dateOfBirth,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccess("Account created successfully! Redirecting to sign in...");
      
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-white">
      {/* Left Column: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 overflow-y-auto">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Brand Header */}
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-[7px] w-[7px] rounded-full bg-[#533afd]" />
              <span className="landing-nav-brand">SecureBank NG</span>
            </Link>
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
              Create an account
            </h1>
            <p className="text-[15px] font-[300] leading-[1.4] text-[#64748d]">
              Fill in your information to open a customer profile.
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

          {/* Success Alert Display */}
          {success && (
            <div className="mb-6 rounded-md bg-[#f0faf2] border border-[#34c759]/20 p-4">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#34c759] text-[13px] mt-[2px]">&bull;</span>
                <span className="text-[13px] text-[#34c759]">{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="block text-[13px] font-[400] text-[#273951]">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Ada"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lastName" className="block text-[13px] font-[400] text-[#273951]">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Okafor"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-[400] text-[#273951]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="ada.okafor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-[400] text-[#273951]">
                Password
              </label>
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

            <div className="space-y-1.5">
              <label htmlFor="dateOfBirth" className="block text-[13px] font-[400] text-[#273951]">
                Date of birth (YYYY-MM-DD)
              </label>
              <input
                id="dateOfBirth"
                type="text"
                placeholder="1990-01-01"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] font-mono tracking-tight text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="transactionPin" className="block text-[13px] font-[400] text-[#273951]">
                Transaction PIN
              </label>
              <input
                id="transactionPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-digit PIN"
                value={transactionPin}
                onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={loading}
                className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] font-mono tracking-widest text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-[13px] font-[400] text-[#273951]">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  type="text"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-[13px] font-[400] text-[#273951]">
                  Address (optional)
                </label>
                <input
                  id="address"
                  type="text"
                  placeholder="12 Admiralty Way, Lekki, Lagos"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#a8c3de] bg-white px-3 py-2 text-[15px] text-[#0d253d] placeholder-[#64748d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="landing-btn-primary w-full mt-4"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <span>Create profile</span>
              )}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-[13px] text-[#64748d]">
              Already have a profile?{" "}
              <Link href="/login" className="text-[#533afd] hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-16 pb-8">
            <p className="text-[11px] font-[300] text-[#64748d]">
              Information stored in encrypted, ACID-compliant database records.
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
