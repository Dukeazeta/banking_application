"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  userId: number;
  email: string;
  role: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.replace("/login?next=" + encodeURIComponent(pathname));
          return;
        }
        
        const authData = await authRes.json();
        if (authData.user.role !== "ADMIN") {
          router.replace("/dashboard");
          return;
        }
        setUser(authData.user);
      } catch (err) {
        console.error("Admin profile fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    router.refresh();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f9fc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Overview", path: "/admin", code: "OV", exact: true },
    { name: "Customers", path: "/admin/customers", code: "CU", exact: false },
    { name: "Security Logs", path: "/admin/logs", code: "SL", exact: false },
  ];

  const initials = user ? user.email?.[0].toUpperCase() || "A" : "A";

  return (
    <div className="min-h-[100dvh] bg-[#f6f9fc] text-[#0d253d] font-sans selection:bg-[#533afd]/20">
      
      <header className="fixed top-0 z-[60] flex h-[64px] w-full items-center justify-between bg-white px-4 md:px-6 shadow-[0_1px_3px_rgba(0,55,112,0.08)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e3e8ee] bg-white text-[#64748d] shadow-[0_1px_3px_rgba(0,55,112,0.08)] transition-colors hover:bg-[#f6f9fc] hover:text-[#0d253d] md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
          >
            <span className="flex h-3.5 w-4 flex-col justify-between" aria-hidden="true">
              <span className="h-px w-full rounded-full bg-current" />
              <span className="h-px w-full rounded-full bg-current" />
              <span className="h-px w-full rounded-full bg-current" />
            </span>
          </button>
          
          <Link href="/admin" className="flex items-center gap-2 hover:opacity-85 md:w-[200px]">
            <div className="h-[7px] w-[7px] rounded-full bg-[#533afd]" />
            <span className="landing-nav-brand hidden sm:block">SecureBank NG</span>
          </Link>
        </div>

        <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
          <span className="text-[11px] font-[400] text-[#64748d] uppercase tracking-[0.1em] [font-feature-settings:'ss01']">
            Admin Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-[14px] font-[400] text-[#0d253d] [font-feature-settings:'ss01'] sm:block">
            System Administrator
          </div>
          
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f9fc] text-[#0d253d] border border-[#e3e8ee] text-[11px] font-[400] shadow-sm">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex min-h-[100dvh] pt-[64px]">
        <aside
          className={`
            group/sidebar fixed bottom-0 left-0 top-[64px] z-50 flex w-[272px] flex-col bg-transparent transition-[transform,width] duration-300 md:z-40 md:w-[80px] md:hover:w-[272px] md:focus-within:w-[272px]
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          `}
        >
          <div className="relative flex min-h-0 w-[272px] flex-1 flex-col overflow-hidden border-r border-[#e3e8ee] bg-white shadow-[0_1px_3px_rgba(0,55,112,0.08)] transition-[width] duration-300 ease-out md:w-[80px] md:group-hover/sidebar:w-[272px] md:group-focus-within/sidebar:w-[272px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_0%_0%,#f5e9d4_0,#f5e9d4_22%,transparent_54%),radial-gradient(circle_at_100%_0%,#b9b9f9_0,#b9b9f9_18%,transparent_50%),radial-gradient(circle_at_70%_35%,#f96bee_0,#f96bee_8%,transparent_40%)] opacity-55 blur-2xl" />

            <div className="relative border-b border-[#e3e8ee] px-5 py-5">
              <div className="flex min-h-9 items-center">
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center md:flex md:group-hover/sidebar:hidden md:group-focus-within/sidebar:hidden">
                  <div className="h-5 w-[3px] rounded-full bg-[#ea2261]" />
                </div>
                <div className="min-w-0 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100">
                  <p className="text-[10px] font-[400] uppercase tracking-[0.1px] text-[#64748d] [font-feature-settings:'ss01']">
                    Admin Portal
                  </p>
                  <p className="mt-1 text-[18px] font-[300] leading-[1.1] tracking-[-0.18px] text-[#0d253d] [font-feature-settings:'ss01']">
                    System Control
                  </p>
                </div>
              </div>
            </div>

            <nav className="relative flex-1 space-y-1 overflow-hidden px-3 py-4">
              {navItems.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.path 
                  : pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`
                      group flex items-center gap-3 rounded-[12px] px-3 py-3 transition-all duration-200 whitespace-nowrap
                      ${isActive 
                        ? "bg-[#f6f9fc] text-[#533afd] shadow-[0_1px_3px_rgba(0,55,112,0.08)] ring-1 ring-[#e3e8ee]" 
                        : "text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#0d253d] hover:translate-x-0.5"
                      }
                    `}
                  >
                    <span
                      className={`
                        flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-[400] tracking-[0.1px] [font-feature-settings:'tnum','ss01']
                        ${isActive ? "bg-[#ea2261] text-white" : "bg-white text-[#64748d] ring-1 ring-[#e3e8ee] group-hover:text-[#ea2261]"}
                      `}
                    >
                      {item.code}
                    </span>
                    <span className={`opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100 text-[14px] [font-feature-settings:'ss01'] ${isActive ? "font-[400]" : "font-[300]"}`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative border-t border-[#e3e8ee] p-3">
              <div className="mb-3 overflow-hidden rounded-[12px] bg-[#f6f9fc] px-3 py-3 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100">
                <p className="text-[10px] font-[400] uppercase tracking-[0.1px] text-[#64748d] [font-feature-settings:'ss01']">
                  Signed in
                </p>
                <p className="mt-1 truncate text-[13px] font-[300] text-[#0d253d] [font-feature-settings:'ss01']">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-full border border-[#e3e8ee] bg-white px-3 py-2.5 text-[#64748d] transition-colors hover:bg-[#fef2f1] hover:border-[#ea2261]/20 hover:text-[#ea2261] whitespace-nowrap"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6f9fc] text-[10px] font-[400] text-[#64748d] [font-feature-settings:'ss01'] group-hover:bg-white group-hover:text-[#ea2261]">
                  SO
                </span>
                <span className="opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100 text-[14px] font-[400] [font-feature-settings:'ss01']">
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[#0d253d]/40 backdrop-blur-sm md:hidden"
          />
        )}

        <main
          className="flex flex-1 flex-col transition-all duration-300 md:pl-[80px] min-w-0"
        >
          <div className="w-full flex-1 px-4 sm:px-8 py-10 lg:px-12">
            <div className="animate-fade-in max-w-[1200px] mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
