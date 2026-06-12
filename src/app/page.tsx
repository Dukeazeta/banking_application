"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.replace(
              data.user.role === "ADMIN" ? "/admin" : data.user.role === "TELLER" ? "/teller" : "/dashboard",
            );
            return;
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
          <span className="landing-caption text-[#64748d]">
            Securing connection
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-white overflow-hidden">
      {/* Gradient mesh backdrop - full viewport, positioned behind content */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/mesh-hero.png"
          alt=""
          fill
          priority
          className="object-cover opacity-60"
          sizes="100vw"
        />
        {/* Subtle bottom fade to white for clean edge */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Navigation - clean, single line, max 64px */}
      <header className="relative z-10 flex h-16 w-full items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="h-[7px] w-[7px] rounded-full bg-[#533afd]" />
          <span className="landing-nav-brand">SecureBank NG</span>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/login"
              className="landing-nav-link"
            >
              Sign in
            </Link>
          </nav>
          <Link
            href="/register"
            className="landing-btn-primary"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero - centered, single moment, max 4 text elements */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 md:px-10 text-center">
        <div className="w-full max-w-[1000px] flex flex-col items-center space-y-8 pb-16">
          {/* Headline - max 2 lines, weight 300, negative tracking */}
          <h1 className="landing-display">
            Digital banking for Nigerian customers
          </h1>

          {/* Subtext - under 20 words, max 4 lines */}
          <p className="landing-body max-w-[640px]">
            Naira accounts, secure transfers, and real-time ledger reconciliation for everyday banking.
          </p>

          {/* CTAs - 1 primary + 1 secondary, no wrap */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4 justify-center">
            <Link
              href="/register"
              className="landing-btn-primary"
            >
              Open account
            </Link>
            <Link
              href="/login"
              className="landing-btn-secondary"
            >
              Access dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal footer line - anchored to bottom */}
      <footer className="relative z-10 flex h-12 items-center justify-between px-6 md:px-10">
        <span className="landing-caption text-[#64748d]">
          CSC 421 - Group 3
        </span>
        <span className="landing-caption text-[#64748d]">
          Nigerian Banking Ledger
        </span>
      </footer>
    </div>
  );
}
