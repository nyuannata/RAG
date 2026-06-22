import axios from "axios";

// Create configured Axios instance pointing to the FastAPI backend API gateway
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/_/backend",
  headers: {
    "Content-Type": "application/json",
  },
});

// Axios request interceptor to dynamically inject the JWT token before request fires
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("rag_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios response interceptor to handle session timeouts and automatic logging out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend returns 401 Unauthorized, automatically clean token and force redirect
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("rag_token");
        // We can do a window redirect or let the store clear auth
        // To avoid looping we just clear the token
      }
    }
    return Promise.reject(error);
  }
);

export default api;
