"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  UploadCloud, 
  Trash2, 
  MessageSquare, 
  LogOut, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Send, 
  ChevronLeft, 
  Menu,
  Plus,
  BookOpen,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  CornerDownLeft,
  X
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, DocumentInfo, ChatSessionInfo } from "@/store/useChatStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  const {
    documents,
    sessions,
    selectedDocumentIds,
    activeSessionId,
    setDocuments,
    setSessions,
    setActiveSessionId,
    toggleSelectDocument,
    clearSelectedDocuments
  } = useChatStore();

  // Sidebar responsive state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat messaging state
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeCitations, setActiveCitations] = useState<any[]>([]);
  const [focusedCitation, setFocusedCitation] = useState<any | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch user data (documents, chat sessions) at startup
  const fetchDocuments = async () => {
    try {
      const res = await api.get("/api/documents");
      setDocuments(res.data);
    } catch (err) {
      console.error("Gagal memuat dokumen", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get("/api/chat/sessions");
      setSessions(res.data);
    } catch (err) {
      console.error("Gagal memuat history chat", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchSessions();

    // Auto refresh documents every 6 seconds to update processing status
    const interval = setInterval(() => {
      fetchDocuments();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch session chat messages when activeSessionId changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      try {
        const res = await api.get(`/api/chat/sessions/${activeSessionId}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error("Gagal memuat pesan", err);
      }
    };

    fetchMessages();
    setStreamingText("");
    setActiveCitations([]);
    setFocusedCitation(null);
  }, [activeSessionId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Logout handler
  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  // Create new session handler
  const handleCreateSession = async () => {
    try {
      const res = await api.post("/api/chat/sessions", { title: "Percakapan Baru" });
      setSessions([res.data, ...sessions]);
      setActiveSessionId(res.data.id);
    } catch (err) {
      console.error("Gagal membuat sesi percakapan", err);
    }
  };

  // Delete session handler
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/chat/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error("Gagal menghapus sesi percakapan", err);
    }
  };

  // Drag-and-drop document upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploadError(null);
    setUploadProgress(10); // Simulated start progress

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(40);
      await api.post("/api/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 1000);
      fetchDocuments();
    } catch (err: any) {
      setUploadProgress(null);
      setUploadError(
        err.response?.data?.detail || "Gagal mengupload dokumen. Coba format PDF/DOCX/TXT."
      );
    }
  };

  // Delete document handler
  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/documents/${docId}`);
      setDocuments(documents.filter((d) => d.id !== docId));
      // Remove from selected lists if deleted
      if (selectedDocumentIds.includes(docId)) {
        toggleSelectDocument(docId);
      }
    } catch (err) {
      console.error("Gagal menghapus dokumen", err);
    }
  };

  // SSE Stream query submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeSessionId || isStreaming) return;

    const currentQuery = inputValue;
    setInputValue("");
    setIsStreaming(true);
    setStreamingText("");
    setActiveCitations([]);
    
    // Add temporary message to UI immediately for conversational feel
    setMessages((prev) => [
      ...prev,
      { role: "user", content: currentQuery, created_at: new Date().toISOString() }
    ]);

    const baseURL = process.env.NEXT_PUBLIC_API_URL || "/_/backend";
    
    try {
      const response = await fetch(`${baseURL}/api/chat/sessions/${activeSessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: currentQuery,
          document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : null
        })
      });

      if (!response.ok) {
        throw new Error("Gagal memulai koneksi streaming.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event: citations")) {
            const dataStr = trimmed.replace("event: citations\ndata:", "").replace("event: citations", "").trim();
            // Extracts JSON array payload
            const rawData = trimmed.split("data: ")[1];
            if (rawData) {
              try {
                const parsedCitations = JSON.parse(rawData);
                setActiveCitations(parsedCitations);
              } catch (e) {
                console.error("Error parsing citations stream", e);
              }
            }
          } else if (trimmed.startsWith("event: text")) {
            const rawData = trimmed.split("data: ")[1];
            if (rawData) {
              try {
                const tokenText = JSON.parse(rawData);
                setStreamingText((prev) => prev + tokenText);
              } catch (e) {
                console.error("Error parsing text token stream", e);
              }
            }
          } else if (trimmed.startsWith("event: done")) {
            // Stream completely finished, pull final message state from db
            setTimeout(async () => {
              try {
                const res = await api.get(`/api/chat/sessions/${activeSessionId}/messages`);
                setMessages(res.data);
                setStreamingText("");
                setActiveCitations([]);
              } catch (e) {
                console.error("Gagal memperbarui messages", e);
              }
            }, 800);
          }
        }
      }
    } catch (err: any) {
      console.error("Error chatting", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `*Gagal mendapatkan respon: ${err.message}*` }
      ]);
    } finally {
      setIsStreaming(false);
      fetchSessions(); // Refresh updated timestamp and title in sidebar
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-8 w-8 text-rose-400" />;
      case "docx":
      case "doc":
        return <BookOpen className="h-8 w-8 text-blue-400" />;
      default:
        return <FileCode className="h-8 w-8 text-slate-400" />;
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex font-sans overflow-hidden">
      
      {/* 1. COLLAPSIBLE LEFT SIDEBAR */}
      <aside 
        className={`h-full border-r border-blue-800 bg-blue-900 flex flex-col transition-all duration-300 relative z-20 ${
          sidebarOpen ? "w-80" : "w-0 -translate-x-full md:w-20 md:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 border-b border-blue-800 flex items-center justify-between">
          {sidebarOpen ? (
            <Link href="/" className="flex items-center gap-2.5">
              <span className="font-bold text-lg tracking-tight text-white">
                RAG Yuan AI
              </span>
            </Link>
          ) : (
            <div className="mx-auto font-bold text-lg tracking-tight text-white">
              RY
            </div>
          )}
          
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-blue-800 rounded-lg text-blue-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* Action Button: New Conversation */}
        <div className="p-4">
          <button 
            onClick={handleCreateSession}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border border-blue-700 bg-blue-800 hover:bg-blue-700 text-white active:scale-[0.98] transition-all cursor-pointer ${
              !sidebarOpen && "aspect-square p-0 border-0 bg-blue-800 text-white hover:bg-blue-700"
            }`}
          >
            <Plus className="h-4.5 w-4.5" />
            {sidebarOpen && "Percakapan Baru"}
          </button>
        </div>

        {/* Document Navigation Shortcut */}
        <div className="px-4 mb-2">
          <button 
            onClick={() => setActiveSessionId(null)}
            className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-all ${
              activeSessionId === null 
                ? "bg-blue-800 text-white border border-blue-700" 
                : "text-blue-300 hover:text-white hover:bg-blue-800/50"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {sidebarOpen && "Kelola Dokumen"}
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">
          {sidebarOpen && <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-3 mb-2">Riwayat Obrolan</p>}
          
          {sessions.length === 0 ? (
            sidebarOpen && (
              <div className="text-center py-8 text-xs text-blue-300/70 space-y-2">
                <HelpCircle className="h-5 w-5 mx-auto opacity-40" />
                <p>Belum ada obrolan</p>
              </div>
            )
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all ${
                  activeSessionId === s.id
                    ? "bg-blue-800 text-white"
                    : "text-blue-200 hover:bg-blue-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${activeSessionId === s.id ? "text-white" : "text-blue-400"}`} />
                  {sidebarOpen && (
                    <span className="truncate pr-2">{s.title}</span>
                  )}
                </div>
                {sidebarOpen && (
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-700 hover:text-rose-400 rounded-lg text-blue-400 transition-all shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Profile and Logout info */}
        <div className="p-4 border-t border-blue-800 bg-blue-900">
          <div className="flex items-center justify-between">
            {sidebarOpen ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-blue-900 shadow-sm shrink-0">
                  {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">{user?.full_name || "Pengguna AI"}</span>
                  <span className="text-[10px] text-blue-300 truncate">{user?.email}</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto h-9 w-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-blue-800">
                {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
              </div>
            )}
            
            {sidebarOpen && (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-blue-800 rounded-xl text-blue-300 hover:text-rose-400 transition-colors"
                title="Keluar"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Floating Sidebar Trigger for collapsed layouts */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-30 p-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl shadow-lg transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* 2. DYNAMIC WORK SPACE */}
      <main className="flex-1 h-full bg-slate-50 flex flex-col relative overflow-hidden">
        
        <AnimatePresence mode="wait">
          {activeSessionId === null ? (
            
            // ==========================================
            // DOCUMENTS DASHBOARD VIEW
            // ==========================================
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full space-y-10"
            >
              {/* Header Info */}
              <div className="flex flex-col gap-2 pt-8 md:pt-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Dashboard Dokumen Perusahaan
                </h1>
                <p className="text-slate-400 text-sm">
                  Kelola dokumen SOP, data referensi, atau panduan kerja internal Anda untuk digunakan oleh AI Chatbot.
                </p>
              </div>

              {/* Upload Drop Zone Widget */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Upload Dokumen Baru</h2>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`glass-panel border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-blue-900 bg-blue-900/5 shadow-lg shadow-blue-900/5 scale-[1.01]" 
                      : "border-slate-300 hover:border-slate-400/80 hover:bg-white/10"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt,.md"
                    className="hidden"
                  />
                  
                  {uploadProgress !== null ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-blue-800 animate-spin" />
                      <p className="text-sm font-semibold text-blue-800">Sedang memproses & mengekstrak berkas... {uploadProgress}%</p>
                      <div className="w-48 h-1 bg-white rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-900 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-14 w-14 rounded-2xl bg-white border border-slate-300 flex items-center justify-center text-slate-400 shadow-md group-hover:scale-105 transition-transform">
                        <UploadCloud className="h-7 w-7 text-blue-800" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Tarik & lepas dokumen Anda di sini, atau klik untuk memilih</p>
                        <p className="text-xs text-slate-500">Mendukung PDF, DOCX, TXT, dan MD (Batas ukuran 10 MB)</p>
                      </div>
                    </>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2.5">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Documents Card Grid */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Daftar Dokumen Anda</h2>
                
                {documents.length === 0 ? (
                  <div className="glass-panel rounded-3xl p-16 text-center text-slate-500 space-y-4">
                    <FileText className="h-10 w-10 mx-auto opacity-30 text-blue-800" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Belum ada dokumen yang diupload</p>
                      <p className="text-xs text-slate-400">Dokumen yang Anda upload akan terdaftar di sini.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4 border border-slate-200 hover:border-slate-300 transition-all shadow-sm"
                      >
                        {/* File details */}
                        <div className="flex gap-4">
                          <div className="shrink-0 p-2 bg-white border border-slate-300 rounded-xl flex items-center justify-center">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-800 truncate" title={doc.filename}>{doc.filename}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">{(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type.toUpperCase()}</p>
                          </div>
                        </div>

                        {/* Status bar */}
                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                          {doc.embedding_status === "completed" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-900/5 px-2 py-1 rounded-md border border-blue-900/10">
                              <CheckCircle className="h-3 w-3" />
                              Siap Ditanyakan
                            </span>
                          )}
                          {doc.embedding_status === "processing" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/5 px-2 py-1 rounded-md border border-amber-500/10">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Menyusun AI...
                            </span>
                          )}
                          {doc.embedding_status === "pending" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-500/5 px-2 py-1 rounded-md border border-slate-500/10">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Antrean
                            </span>
                          )}
                          {doc.embedding_status === "failed" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/5 px-2 py-1 rounded-md border border-rose-500/10">
                              <AlertCircle className="h-3 w-3" />
                              Gagal
                            </span>
                          )}

                          <button
                            onClick={(e) => handleDeleteDocument(doc.id, e)}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Hapus Dokumen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            
            // ==========================================
            // RAG CHATROOM VIEW
            // ==========================================
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Chat Header Widget */}
              <div className="h-16 px-6 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/40 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-3 min-w-0 pl-10 md:pl-0">
                  <div className="p-2 bg-white border border-slate-300 rounded-xl flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4.5 w-4.5 text-blue-800" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 truncate">
                    {sessions.find((s) => s.id === activeSessionId)?.title || "Obrolan Aktif"}
                  </h2>
                </div>

                {/* Back to documents */}
                <button
                  onClick={() => setActiveSessionId(null)}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white/50 hover:bg-white text-xs font-semibold text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Dashboard Dokumen
                </button>
              </div>

              {/* Multi-Document Selector Header Capsule */}
              <div className="px-6 py-2.5 border-b border-slate-200/50 bg-slate-50/20 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-800" />
                  Basis Rujukan:
                </span>
                
                {documents.filter(d => d.embedding_status === "completed").length === 0 ? (
                  <span className="text-xs text-slate-400 italic">Belum ada dokumen siap ditanyakan.</span>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* All documents option */}
                    <button
                      onClick={clearSelectedDocuments}
                      className={`text-[10px] px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer ${
                        selectedDocumentIds.length === 0
                          ? "bg-blue-900/10 text-blue-800 border-blue-900/30"
                          : "bg-white text-slate-500 border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      Semua Dokumen ({documents.filter(d => d.embedding_status === "completed").length})
                    </button>

                    {/* Single document items */}
                    {documents
                      .filter((d) => d.embedding_status === "completed")
                      .map((doc) => {
                        const isSelected = selectedDocumentIds.includes(doc.id);
                        return (
                          <button
                            key={doc.id}
                            onClick={() => toggleSelectDocument(doc.id)}
                            className={`text-[10px] px-2.5 py-1 rounded-md font-semibold border max-w-[150px] truncate transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-900/15 text-blue-700 border-blue-800/35"
                                : "bg-white/50 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-400"
                            }`}
                            title={doc.filename}
                          >
                            {doc.filename}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Chat Message Scroll Workspace */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/10 relative">
                {messages.length === 0 && !streamingText && (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-4 pt-16">
                    <div className="h-12 w-12 rounded-full bg-white border border-slate-300 flex items-center justify-center text-blue-800">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold">Mulai Percakapan Kontekstual</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Tanyakan apa saja seputar dokumen perusahaan Anda. AI akan menganalisis konten dan merumuskan jawaban lengkap dengan rujukan kutipan sumber.
                      </p>
                    </div>
                  </div>
                )}

                {/* List Messages */}
                {messages.map((msg, index) => {
                  const hasCitations = msg.citations?.citations && msg.citations.citations.length > 0;
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Avatar */}
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                        msg.role === "user" 
                          ? "bg-white border-slate-300 text-blue-800" 
                          : "bg-gradient-to-tr from-blue-800 to-blue-800 border-blue-900/20 text-white shadow-sm"
                      }`}>
                        {msg.role === "user" ? "U" : "AI"}
                      </div>

                      {/* Message Bubble Container */}
                      <div className="flex flex-col gap-2 min-w-0 max-w-[85%]">
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed border ${
                          msg.role === "user"
                            ? "bg-white/60 border-slate-300/80 text-slate-800"
                            : "bg-white/20 border-slate-200 text-slate-800 prose-chat"
                        }`}>
                          {/* User text uses plain block, assistant runs simple text formatting */}
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: msg.content
                                  // Simple rich formatter for bold/italic and bullets to prevent dependency errors
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/\n\s*-\s*(.*?)/g, '<li>$1</li>')
                                  .replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')
                                  .replace(/\n/g, '<br/>')
                                  // Citations linking formatter [Sumber X]
                                  .replace(/\[Sumber\s*(\d+)\]/g, '<span class="inline-flex items-center justify-center h-4.5 px-1.5 ml-1 rounded bg-violet-900/35 text-blue-700 border border-blue-800/20 font-bold text-[9px] cursor-pointer select-none">S$1</span>')
                              }} 
                            />
                          )}
                        </div>

                        {/* Citation Footnotes Popover Row */}
                        {hasCitations && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mr-1">Rujukan:</span>
                            {msg.citations.citations.map((cit: any) => (
                              <button
                                key={cit.index}
                                onClick={() => setFocusedCitation(cit)}
                                className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-400 hover:text-blue-800 hover:border-blue-900/20 transition-all cursor-pointer"
                              >
                                {cit.index}. {cit.filename} (Hal. {cit.page})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Real-time Streaming message box */}
                {streamingText && (
                  <div className="flex gap-4 max-w-3xl mr-auto">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-800 to-blue-800 border border-blue-900/20 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm animate-pulse">
                      AI
                    </div>
                    <div className="flex flex-col gap-2 min-w-0 max-w-[85%]">
                      <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed border bg-white/20 border-slate-200 text-slate-800 prose-chat">
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: streamingText
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/\n\s*-\s*(.*?)/g, '<li>$1</li>')
                              .replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')
                              .replace(/\n/g, '<br/>')
                              .replace(/\[Sumber\s*(\d+)\]/g, '<span class="inline-flex items-center justify-center h-4.5 px-1.5 ml-1 rounded bg-violet-900/35 text-blue-700 border border-blue-800/20 font-bold text-[9px]">S$1</span>')
                          }} 
                        />
                        {/* Cursor blinking */}
                        <span className="inline-block h-3.5 w-1.5 bg-blue-800 ml-1 animate-pulse" />
                      </div>
                      
                      {activeCitations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mr-1">Mengekstrak Referensi...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Dock Area */}
              <div className="p-4 border-t border-slate-200/60 bg-slate-50/40 backdrop-blur-md relative z-10">
                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative">
                  
                  {selectedDocumentIds.length > 0 && (
                    <div className="absolute -top-7 left-3 text-[10px] font-semibold text-blue-700 flex items-center gap-1 bg-violet-950/30 px-2 py-0.5 rounded border border-blue-800/10">
                      Mengunci {selectedDocumentIds.length} Dokumen Pilihan
                    </div>
                  )}

                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isStreaming || documents.filter(d => d.embedding_status === "completed").length === 0}
                    placeholder={
                      documents.filter(d => d.embedding_status === "completed").length === 0
                        ? "Harap upload dokumen di dashboard untuk bertanya..."
                        : "Tanyakan info dokumen di sini... (Contoh: Apa isi SOP cuti?)"
                    }
                    className="w-full pl-5 pr-14 py-4 text-sm rounded-2xl bg-white border border-slate-300/80 focus:border-blue-900/60 focus:ring-1 focus:ring-blue-900/30 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isStreaming}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 w-10 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
                  </button>
                </form>
                <p className="text-center text-[10px] text-slate-400 mt-2.5">
                  AI dapat melakukan kesalahan. Harap verifikasi rujukan sumber yang disediakan.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. DYNAMIC CITATIONS DRAWER/MODAL POPUP */}
        <AnimatePresence>
          {focusedCitation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={() => setFocusedCitation(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="w-full max-w-2xl bg-white border border-slate-300 rounded-3xl p-6 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-blue-900/10 text-blue-700 border border-blue-800/20 flex items-center justify-center text-xs font-bold shrink-0">
                      S{focusedCitation.index}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 truncate max-w-md">
                      {focusedCitation.filename}
                    </h3>
                  </div>
                  <button
                    onClick={() => setFocusedCitation(null)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Halaman Terkait: {focusedCitation.page}</span>
                    <span>Format: Chunks Ingest</span>
                  </div>
                  
                  {/* Content snippet */}
                  <div className="max-h-72 overflow-y-auto p-4 bg-slate-50 border border-slate-950 rounded-2xl text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">
                    {focusedCitation.content}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setFocusedCitation(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-700 text-xs font-bold text-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Tutup Referensi
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

    </div>
  );
}
