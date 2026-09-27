import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status?: "draft" | "live" | "suspended";
  currency?: string;
  templateKey?: string;
  theme?: any;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  storeName: string;
  storeSlug: string;
  templateKey: string;
}

interface AuthStore {
  user: User | null;
  store: Store | null;
  token: string | null;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  setStore: (store: Store) => void;
  logout: () => void;
  fetchMe: (token: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** The API's message (and first validation detail), so the form can show what went wrong. */
async function apiError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null);
  const detail = body?.details?.[0]?.message;
  return new Error(detail ?? body?.error ?? fallback);
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      store: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });

          if (!response.ok) {
            throw await apiError(response, "Login failed");
          }

          const data = await response.json();
          set({
            user: data.user,
            store: data.store,
            token: data.token
          });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (input: RegisterInput) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input)
          });

          if (!response.ok) {
            throw await apiError(response, "Registration failed");
          }

          const data = await response.json();
          set({
            user: data.user,
            store: data.store,
            token: data.token
          });
        } finally {
          set({ isLoading: false });
        }
      },

      setStore: (store: Store) => set({ store }),

      logout: () => {
        set({
          user: null,
          store: null,
          token: null
        });
      },

      fetchMe: async (token: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) {
            throw new Error("Failed to fetch user");
          }

          const data = await response.json();
          set({
            user: data.user,
            store: data.store,
            token
          });
        } catch (error) {
          set({ user: null, store: null, token: null });
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: "auth-store",
      partialize: ({ user, store, token }) => ({ user, store, token })
    }
  )
);

/**
 * False until the saved session has been read from localStorage. Pages must
 * not redirect to /login before this is true, or a refresh logs people out.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}
