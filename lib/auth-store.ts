import { create } from "zustand";
import type { User } from "@/types";

const AUTH_STORAGE_KEY = "wh-auth-local";

type StoredAuth = {
  token: string | null;
  user: User | null;
};

function readStoredAuth(): StoredAuth {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { token: null, user: null };
    }

    const parsed = JSON.parse(raw) as StoredAuth;
    return {
      token: parsed.token ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function writeStoredAuth(auth: StoredAuth) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  hydrateFromStorage: () => void;
  setToken: (token: string | null) => void;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrateFromStorage: () => {
    const storedAuth = readStoredAuth();
    set({
      token: storedAuth.token,
      user: storedAuth.user,
      hydrated: true,
    });
  },
  setToken: (token) => {
    const user = get().user;
    if (token) {
      writeStoredAuth({ token, user });
    } else {
      clearStoredAuth();
    }
    set({ token });
  },
  setAuth: (token, user) => {
    writeStoredAuth({ token, user });
    set({ token, user, hydrated: true });
  },
  setUser: (user) => {
    const token = get().token;
    if (token) {
      writeStoredAuth({ token, user });
    }
    set({ user });
  },
  logout: () => {
    clearStoredAuth();
    set({ token: null, user: null, hydrated: true });
  },
}));
