"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { access_token } = res.data;
      
      // Fetch profile to fully initialize auth session
      const userRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      setAuth(access_token, userRes.data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Gagal masuk. Silakan periksa koneksi Anda."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 relative font-sans">
      {/* Decorative Blur Circles */}
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-blue-900/5 blur-[120px] top-[10%] left-[10%] pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-blue-900/5 blur-[120px] bottom-[10%] right-[10%] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-4">
            <span className="font-bold text-2xl tracking-tight text-blue-900">
              RAG Yuan AI
            </span>
          </Link>
          <h2 className="text-xl font-bold">Selamat datang kembali</h2>
          <p className="text-slate-400 text-sm mt-1">Masuk untuk mengakses chatbot dokumen Anda</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl border border-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-3.5 text-sm rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Alamat Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-slate-300 focus:border-blue-900/60 focus:ring-1 focus:ring-blue-900/30 outline-none transition-all placeholder:text-slate-400"
                placeholder="nama@perusahaan.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl bg-white border border-slate-300 focus:border-blue-900/60 focus:ring-1 focus:ring-blue-900/30 outline-none transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 active:scale-[0.98] transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses Masuk...
                </>
              ) : (
                "Masuk Sesi"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Belum punya akun?{" "}
            <Link href="/register" className="text-blue-900 hover:underline">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
