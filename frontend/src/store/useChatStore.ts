import { create } from "zustand";

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  embedding_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface ChatSessionInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  selectedDocumentIds: string[];
  documents: DocumentInfo[];
  sessions: ChatSessionInfo[];
  activeSessionId: string | null;
  
  setSelectedDocumentIds: (ids: string[]) => void;
  toggleSelectDocument: (id: string) => void;
  clearSelectedDocuments: () => void;
  setDocuments: (docs: DocumentInfo[]) => void;
  setSessions: (sessions: ChatSessionInfo[]) => void;
  setActiveSessionId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedDocumentIds: [],
  documents: [],
  sessions: [],
  activeSessionId: null,

  setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),

  toggleSelectDocument: (id) => set((state) => {
    const isSelected = state.selectedDocumentIds.includes(id);
    const selectedDocumentIds = isSelected
      ? state.selectedDocumentIds.filter((docId) => docId !== id)
      : [...state.selectedDocumentIds, id];
    return { selectedDocumentIds };
  }),

  clearSelectedDocuments: () => set({ selectedDocumentIds: [] }),
  setDocuments: (documents) => set({ documents }),
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
}));
