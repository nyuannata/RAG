import { create } from "zustand";

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  embedding_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  folder_id?: string;
}

export interface ChatSessionInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  folder_id?: string;
  tag_ids?: string[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  folders: FolderInfo[];
}

export interface FolderInfo {
  id: string;
  project_id: string;
  name: string;
}

export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface ChatState {
  selectedDocumentIds: string[];
  documents: DocumentInfo[];
  sessions: ChatSessionInfo[];
  projects: ProjectInfo[];
  tags: TagInfo[];
  activeSessionId: string | null;
  activeFolderId: string | null;
  activeTagId: string | null;
  
  setSelectedDocumentIds: (ids: string[]) => void;
  toggleSelectDocument: (id: string) => void;
  clearSelectedDocuments: () => void;
  setDocuments: (docs: DocumentInfo[]) => void;
  setSessions: (sessions: ChatSessionInfo[]) => void;
  setProjects: (projects: ProjectInfo[]) => void;
  setTags: (tags: TagInfo[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setActiveFolderId: (id: string | null) => void;
  setActiveTagId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedDocumentIds: [],
  documents: [],
  sessions: [],
  projects: [],
  tags: [],
  activeSessionId: null,
  activeFolderId: null,
  activeTagId: null,

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
  setProjects: (projects) => set({ projects }),
  setTags: (tags) => set({ tags }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setActiveFolderId: (activeFolderId) => set({ activeFolderId }),
  setActiveTagId: (activeTagId) => set({ activeTagId }),
}));
