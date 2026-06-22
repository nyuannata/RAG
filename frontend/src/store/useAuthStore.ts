import { create } from "zustand";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rag_token", token);
    }
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("rag_token");
    }
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  initialize: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("rag_token");
      if (token) {
        set({ token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
