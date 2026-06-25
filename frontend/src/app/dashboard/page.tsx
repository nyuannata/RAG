"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, UploadCloud, Trash2, MessageSquare, LogOut, FileText, 
  CheckCircle, AlertCircle, Loader2, Send, Plus, BookOpen, HelpCircle, 
  FileCode, X, Pencil, Check, Settings, Folder, Tag
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, DocumentInfo, ChatSessionInfo, ProjectInfo, TagInfo, FolderInfo } from "@/store/useChatStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  const {
    documents, sessions, projects, tags,
    selectedDocumentIds, activeSessionId, activeFolderId, activeTagId,
    setDocuments, setSessions, setProjects, setTags,
    setActiveSessionId, setActiveFolderId, setActiveTagId,
    toggleSelectDocument, clearSelectedDocuments
  } = useChatStore();

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
  
  // Rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch data
  const fetchData = async () => {
    try {
      const [docRes, sessRes, projRes, tagRes] = await Promise.all([
        api.get("/api/documents"),
        api.get("/api/chat/sessions"),
        api.get("/api/projects"),
        api.get("/api/tags")
      ]);
      setDocuments(docRes.data);
      setSessions(sessRes.data);
      setProjects(projRes.data);
      setTags(tagRes.data);
    } catch (err) {
      console.error("Gagal memuat data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch session messages
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Derived state for filtering
  const filteredDocuments = documents.filter(doc => 
    activeFolderId ? doc.folder_id === activeFolderId : true
  );

  const filteredSessions = sessions.filter(sess => {
    const matchFolder = activeFolderId ? sess.folder_id === activeFolderId : true;
    const matchTag = activeTagId ? sess.tag_ids?.includes(activeTagId) : true;
    return matchFolder && matchTag;
  });

  const activeSessionData = sessions.find(s => s.id === activeSessionId);

  // Project & Tag Actions
  const handleCreateProject = async () => {
    const name = prompt("Nama Project Baru:");
    if (!name) return;
    try {
      await api.post("/api/projects", { name });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreateFolder = async (projectId: string) => {
    const name = prompt("Nama Sub-Folder Baru:");
    if (!name) return;
    try {
      await api.post(`/api/projects/${projectId}/folders`, { name, project_id: projectId });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreateTag = async () => {
    const name = prompt("Nama Tag Baru:");
    if (!name) return;
    const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    try {
      await api.post("/api/tags", { name, color: randomColor });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleToggleTagOnSession = async (tagId: string) => {
    if (!activeSessionId || !activeSessionData) return;
    const currentTags = activeSessionData.tag_ids || [];
    const newTags = currentTags.includes(tagId) 
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    try {
      await api.put(`/api/chat/sessions/${activeSessionId}`, { tag_ids: newTags });
      fetchData();
    } catch (err) { console.error(err); }
  };

  // Chat Actions
  const handleCreateSession = async () => {
    try {
      const res = await api.post("/api/chat/sessions", { 
        title: "Percakapan Baru",
        folder_id: activeFolderId || undefined
      });
      fetchData();
      setActiveSessionId(res.data.id);
    } catch (err) { console.error(err); }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/chat/sessions/${sessionId}`);
      fetchData();
      if (activeSessionId === sessionId) setActiveSessionId(null);
    } catch (err) { console.error(err); }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await api.put(`/api/chat/sessions/${sessionId}`, { title: newTitle });
      fetchData();
      setEditingSessionId(null);
    } catch (err) { console.error(err); }
  };

  // File Upload Handlers
  const uploadFile = async (file: File) => {
    setUploadError(null);
    setUploadProgress(10);
    const formData = new FormData();
    formData.append("file", file);
    if (activeFolderId) {
      formData.append("folder_id", activeFolderId);
    }
    try {
      setUploadProgress(40);
      await api.post("/api/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 1000);
      fetchData();
    } catch (err: any) {
      setUploadProgress(null);
      setUploadError(err.response?.data?.detail || "Gagal mengupload dokumen.");
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/documents/${docId}`);
      fetchData();
      if (selectedDocumentIds.includes(docId)) toggleSelectDocument(docId);
    } catch (err) { console.error(err); }
  };

  // Chat Stream
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeSessionId || isStreaming) return;

    const currentQuery = inputValue;
    setInputValue("");
    setIsStreaming(true);
    setStreamingText("");
    setActiveCitations([]);
    
    setMessages(prev => [...prev, { role: "user", content: currentQuery, created_at: new Date().toISOString() }]);

    const baseURL = process.env.NEXT_PUBLIC_API_URL || "/_/backend";
    try {
      const response = await fetch(`${baseURL}/api/chat/sessions/${activeSessionId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          message: currentQuery,
          document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : null
        })
      });

      if (!response.ok) throw new Error("Gagal memulai koneksi streaming.");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          
          const lines = chunk.split("\n");
          let eventType = "message";
          let data = "";
          
          for (const line of lines) {
             if (line.startsWith("event:")) {
                eventType = line.substring(6).trim();
             } else if (line.startsWith("data:")) {
                data += line.substring(5).trim();
             }
          }
          
          if (eventType === "citations") {
             try { setActiveCitations(JSON.parse(data)); } catch (e) {}
          } else if (eventType === "text") {
             try { setStreamingText(prev => prev + JSON.parse(data)); } catch (e) {}
          } else if (eventType === "done") {
             setTimeout(async () => {
              const res = await api.get(`/api/chat/sessions/${activeSessionId}/messages`);
              setMessages(res.data);
              setStreamingText("");
              setActiveCitations([]);
            }, 800);
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `*Gagal: ${err.message}*` }]);
    } finally {
      setIsStreaming(false);
      fetchData();
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) await uploadFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex font-sans overflow-hidden">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-[260px] h-full bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="h-20 px-5 border-b border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
            {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 truncate">{user?.full_name || "Pengguna AI"}</span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Workspace</span>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex gap-2">
          <button onClick={handleCreateSession} className="flex-1 flex justify-center items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-sm">
            <Plus className="h-4 w-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* PROJECTS & FOLDERS */}
          <div className="mb-6 px-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</p>
              <button onClick={handleCreateProject} className="p-0.5 text-slate-400 hover:text-slate-600 rounded bg-slate-100"><Plus className="h-3 w-3" /></button>
            </div>
            
            <div className="space-y-1">
              <div 
                onClick={() => setActiveFolderId(null)}
                className={`flex items-center gap-2.5 px-2 py-1.5 text-sm font-medium cursor-pointer rounded ${activeFolderId === null ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Folder className="h-4 w-4" />
                <span>All Documents</span>
              </div>

              {projects.map(proj => (
                <div key={proj.id} className="mt-2">
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm font-bold text-slate-700 group">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded border border-slate-200 bg-slate-50 text-slate-500">
                        <span className="text-[9px] font-bold">{proj.name.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <span>{proj.name}</span>
                    </div>
                    <button onClick={() => handleCreateFolder(proj.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="ml-5 pl-4 border-l border-slate-100 space-y-0.5">
                    {proj.folders.map(folder => (
                      <div 
                        key={folder.id} 
                        onClick={() => setActiveFolderId(folder.id)}
                        className={`px-2 py-1.5 text-xs cursor-pointer rounded ${activeFolderId === folder.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                        {folder.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TAGS */}
          <div className="mb-6 px-2">
             <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags</p>
              <button onClick={handleCreateTag} className="p-0.5 text-slate-400 hover:text-slate-600 rounded bg-slate-100"><Plus className="h-3 w-3" /></button>
            </div>
            <div className="space-y-1">
              <div 
                onClick={() => setActiveTagId(null)}
                className={`flex items-center gap-2.5 px-2 py-1.5 text-xs font-medium cursor-pointer rounded ${activeTagId === null ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <span>All Tags</span>
              </div>
              {tags.map(tag => (
                <div 
                  key={tag.id}
                  onClick={() => setActiveTagId(tag.id)}
                  className={`flex items-center gap-2.5 px-2 py-1.5 text-xs cursor-pointer rounded ${activeTagId === tag.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }}></span>
                  <span>{tag.name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3 pt-2 border-t border-slate-100">Recent Chats</p>
          {filteredSessions.map((s) => (
            <div key={s.id} className={`group flex flex-col px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeSessionId === s.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="flex items-center justify-between">
                {editingSessionId === s.id ? (
                  <div className="flex items-center w-full gap-2" onClick={e => e.stopPropagation()}>
                    <input autoFocus type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSession(s.id, editTitle); if (e.key === 'Escape') setEditingSessionId(null); }} className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
                    <button onClick={() => handleRenameSession(s.id, editTitle)} className="p-1 hover:bg-blue-100 text-blue-600 rounded"><Check className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <div onClick={() => setActiveSessionId(s.id)} className={`flex items-center gap-2.5 flex-1 min-w-0 ${activeSessionId === s.id ? "text-blue-700 font-bold" : "text-slate-600"}`}>
                      <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${activeSessionId === s.id ? "text-blue-700" : "text-slate-400"}`} />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingSessionId(s.id); setEditTitle(s.title); }} className="p-1 hover:bg-slate-200 text-slate-500 rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => handleDeleteSession(s.id, e)} className="p-1 hover:bg-rose-100 text-rose-500 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
           <button onClick={clearAuth} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <LogOut className="h-4.5 w-4.5 text-slate-400" /> Logout
            </button>
        </div>
      </aside>

      {/* 2. MIDDLE COLUMN (Upload & Knowledge Base) */}
      <main className="flex-1 h-full flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
        <div className="p-8 flex-1 overflow-y-auto space-y-8 max-w-4xl mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-4">
              {activeFolderId 
                ? `Folder: ${projects.flatMap(p => p.folders).find(f => f.id === activeFolderId)?.name}`
                : 'All Documents'}
            </h1>
            
            <div
              onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-3 text-center cursor-pointer bg-white transition-all duration-300 ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"}`}
            >
              <input ref={fileInputRef} type="file" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} accept=".pdf,.docx,.txt,.md" className="hidden" />
              {uploadProgress !== null ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">Processing... {uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 bg-white"><UploadCloud className="h-5 w-5" /></div>
                  <h3 className="text-sm font-bold text-slate-700">Click to upload or drag and drop</h3>
                  <p className="text-xs text-slate-500">To: {activeFolderId ? projects.flatMap(p=>p.folders).find(f=>f.id===activeFolderId)?.name : 'Global Space'}</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-7">File Name</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-3 text-right">Action</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-slate-50 transition-colors">
                  <div className="col-span-7 flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 truncate">{doc.filename}</span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${doc.embedding_status === 'completed' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>
                      {doc.embedding_status}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-3 text-xs text-slate-500">
                      <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              {filteredDocuments.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Belum ada dokumen di folder ini.</div>}
            </div>
          </div>
        </div>
      </main>

      {/* 3. RIGHT COLUMN (Chat Interface) */}
      <aside className="w-[450px] h-full bg-white flex flex-col shrink-0 relative z-10 shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.05)]">
         {!activeSessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
               <div className="h-16 w-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400"><MessageSquare className="h-8 w-8" /></div>
               <h3 className="font-bold text-slate-800">No Chat Selected</h3>
            </div>
         ) : (
            <>
               <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0"><Sparkles className="h-5 w-5" /></div>
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">AI Assistant</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {activeSessionData?.tag_ids?.map(tid => {
                            const t = tags.find(x => x.id === tid);
                            return t ? <span key={tid} className="text-[9px] px-1.5 py-0.5 rounded text-white font-bold" style={{backgroundColor: t.color}}>{t.name}</span> : null;
                          })}
                        </div>
                     </div>
                  </div>
                  
                  {/* TAGS DROPDOWN */}
                  <div className="relative group">
                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><Tag className="h-4 w-4" /></button>
                    <div className="absolute right-0 top-10 w-40 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 px-2 mb-1">Assign Tags</p>
                      {tags.map(tag => (
                        <div key={tag.id} onClick={() => handleToggleTagOnSession(tag.id)} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs font-medium">
                          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor: tag.color}}></span>{tag.name}</div>
                          {activeSessionData?.tag_ids?.includes(tag.id) && <Check className="h-3 w-3 text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    const hasCitations = msg.citations?.citations && msg.citations.citations.length > 0;
                    return (
                      <div key={msg.id || index} className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser ? "bg-slate-800 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm prose-chat"}`}>
                            {isUser ? <p className="whitespace-pre-wrap">{msg.content}</p> : <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\[Sumber[^\]]*\]/gi, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n\s*-\s*(.*?)/g, '<li>$1</li>').replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>').replace(/\n/g, '<br/>') }} />}
                          </div>
                          {hasCitations && (
                             <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center mr-1">Rujukan:</span>
                                {msg.citations.citations.map((cit: any) => (
                                   <button
                                      key={cit.index}
                                      onClick={() => setFocusedCitation(cit)}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                                   >
                                      {cit.index}. {cit.filename}
                                   </button>
                                ))}
                             </div>
                          )}
                      </div>
                    );
                  })}
                  {streamingText && (
                     <div className="flex flex-col gap-1 max-w-[85%] mr-auto items-start">
                        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm bg-slate-100 text-slate-800 rounded-bl-sm prose-chat">
                           <div dangerouslySetInnerHTML={{ __html: streamingText.replace(/\[Sumber[^\]]*\]/gi, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n\s*-\s*(.*?)/g, '<li>$1</li>').replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>').replace(/\n/g, '<br/>') }} />
                           <span className="inline-block h-3 w-1.5 bg-slate-400 ml-1 animate-pulse" />
                        </div>
                        {activeCitations.length > 0 && (
                             <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center mr-1">Rujukan:</span>
                                {activeCitations.map((cit: any) => (
                                   <button
                                      key={cit.index}
                                      onClick={() => setFocusedCitation(cit)}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                                   >
                                      {cit.index}. {cit.filename}
                                   </button>
                                ))}
                             </div>
                        )}
                     </div>
                  )}
                  <div ref={chatEndRef} />
               </div>

               <div className="p-4 bg-white border-t border-slate-100">
                  <form onSubmit={handleSendMessage} className="relative">
                     <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isStreaming} placeholder="Ask a question..." className="w-full pl-5 pr-14 py-3.5 text-sm rounded-xl bg-slate-50 border border-slate-200 outline-none" />
                     <button type="submit" disabled={!inputValue.trim() || isStreaming} className="absolute right-2.5 top-2 h-8 w-8 bg-slate-800 text-white rounded-lg flex items-center justify-center"><Send className="h-3.5 w-3.5" /></button>
                  </form>
               </div>
            </>
         )}
      </aside>

      {/* Citations Modal */}
      <AnimatePresence>
         {focusedCitation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setFocusedCitation(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                 <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-xs font-bold shrink-0">S{focusedCitation.index}</span>
                    <h3 className="font-bold text-sm text-slate-900 truncate max-w-md">{focusedCitation.filename}</h3>
                 </div>
                 <button onClick={() => setFocusedCitation(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
               </div>
               <div className="space-y-2">
                 <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider"><span>Halaman: {focusedCitation.page}</span></div>
                 <div className="max-h-72 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">{focusedCitation.text || focusedCitation.content || "Tidak ada teks detail."}</div>
               </div>
            </motion.div>
          </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
