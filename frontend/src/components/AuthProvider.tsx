"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, initialize, setAuth, clearAuth, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Initialize auth token from LocalStorage
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 2. Fetch current user profiles if token is present
  useEffect(() => {
    const fetchUser = async () => {
      const activeToken = token || localStorage.getItem("rag_token");
      if (!activeToken) {
        clearAuth();
        return;
      }
      try {
        const res = await api.get("/api/auth/me");
        setAuth(activeToken, res.data);
      } catch (err) {
        clearAuth();
      }
    };

    if (token) {
      fetchUser();
    }
  }, [token, setAuth, clearAuth]);

  // 3. Route Guard: Ensure protected paths require authentication
  useEffect(() => {
    if (isLoading) return;

    const isPublicPath = PUBLIC_PATHS.includes(pathname);
    
    if (!isAuthenticated && !isPublicPath) {
      // Redirect to login if user attempts to access dashboard/chat without auth
      router.push("/login");
    } else if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
      // Redirect to dashboard if logged-in user visits login or register
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-emerald-400 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-widest uppercase animate-pulse">Memuat Sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
