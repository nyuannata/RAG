"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password.length < 6) {
      setError("Kata sandi harus minimal 6 karakter.");
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/api/auth/register", {
        email,
        password,
        full_name: fullName || null
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Gagal mendaftar. Silakan coba email lain."
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
          <h2 className="text-xl font-bold">Mulai akun gratis Anda</h2>
          <p className="text-slate-400 text-sm mt-1">Hanya butuh beberapa detik untuk memulai</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl border border-slate-200/60">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-blue-900/10 border border-blue-900/30 flex items-center justify-center mx-auto text-blue-900">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-blue-900">Pendaftaran Berhasil!</h3>
              <p className="text-slate-400 text-sm">Mengalihkan Anda ke halaman login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="p-3.5 text-sm rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-slate-300 focus:border-blue-900/60 focus:ring-1 focus:ring-blue-900/30 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Budi Santoso"
                />
              </div>

              {/* Email */}
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

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Kata Sandi (Min. 6 Karakter)
                </label>
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
                    Mendaftarkan...
                  </>
                ) : (
                  "Buat Akun Sekarang"
                )}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center text-sm text-slate-500 mt-6">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="text-blue-900 hover:underline">
                Masuk Sesi
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
