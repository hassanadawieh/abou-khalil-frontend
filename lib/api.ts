import axios from "axios";
import { useAuthStore } from "./auth-store";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authHeader =
      error.config?.headers?.Authorization ??
      error.config?.headers?.authorization;

    if (error.response?.status === 401 && authHeader) {
      const store = useAuthStore.getState();
      if (store.token) {
        store.logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
