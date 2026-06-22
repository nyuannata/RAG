import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "RAG Yuan AI - Solusi AI Internal Pintar",
  description: "Upload dokumen internal perusahaan seperti SOP, PDF, DOCX, TXT, dan biarkan AI menjawab pertanyaan secara kontekstual lengkap dengan rujukan sumber dan halaman.",
  keywords: "rag, chatbot, ai, pdf search, sop search, enterprise ai, company documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body
        className={`${inter.variable} font-sans bg-slate-50 text-slate-900 antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

