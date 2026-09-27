import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  theme?: any;
}

interface AuthStore {
  user: User | null;
  store: Store | null;
  token: string | null;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    storeName: string,
    storeSlug: string
  ) => Promise<void>;
  logout: () => void;
  fetchMe: (token: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
            throw new Error("Login failed");
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

      register: async (
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        storeName: string,
        storeSlug: string
      ) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              firstName,
              lastName,
              storeName,
              storeSlug
            })
          });

          if (!response.ok) {
            throw new Error("Registration failed");
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
      name: "auth-store"
    }
  )
);
