"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, UserPlus } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans overflow-hidden relative">
      {/* Decorative Blur Circles */}
      <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-slate-400/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10 px-6"
      >
        <div className="glass-panel p-10 rounded-3xl text-center shadow-xl border border-white/60 bg-white/70 backdrop-blur-xl">
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-blue-900 mt-4">
            RAG Yuan AI
          </h1>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed">
            Portal Chatbot Dokumen Cerdas Anda. Silakan masuk atau daftar untuk memulai percakapan kontekstual dengan dokumen Anda.
          </p>

          <div className="flex flex-col gap-4">
            <Link
              href="/login"
              className="w-full px-6 py-4 flex items-center justify-center gap-2 font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-2xl transition-all duration-300 shadow-lg shadow-blue-900/25 active:scale-[0.98]"
            >
              Masuk ke Akun
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            
            <Link
              href="/register"
              className="w-full px-6 py-4 flex items-center justify-center gap-2 font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98]"
            >
              <UserPlus className="h-4.5 w-4.5 text-slate-500" />
              Daftar Akun Baru
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
