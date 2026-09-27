import axios, { AxiosInstance } from "axios";
import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logout on 401
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Product API
export const productApi = {
  list: () => apiClient.get("/products"),
  get: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: any) => apiClient.post("/products", data),
  update: (id: string, data: any) => apiClient.patch(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`)
};

// Order API
export const orderApi = {
  list: () => apiClient.get("/orders"),
  get: (id: string) => apiClient.get(`/orders/${id}`),
  updateStatus: (id: string, change: { status?: string; fulfillmentStatus?: string }) =>
    apiClient.patch(`/orders/${id}/status`, change),
  markPaid: (id: string) => apiClient.post(`/orders/${id}/mark-paid`)
};

// Store API
export const storeApi = {
  getMe: () => apiClient.get("/stores/me"),
  update: (data: any) => apiClient.patch("/stores/me", data),
  updateTheme: (data: any) => apiClient.patch("/stores/me/theme", data),
  getBySlug: (slug: string) => apiClient.get(`/stores/${slug}`),
  applyTemplate: (key: string, replacePages: boolean) => apiClient.post("/stores/me/template", { key, replacePages }),
  modules: () => apiClient.get("/stores/me/modules"),
  setModule: (key: string, enabled: boolean) => apiClient.put(`/stores/me/modules/${key}`, { enabled })
};

// Storefront pages (section builder)
const pagePath = (slug: string) => `/stores/me/pages/${encodeURIComponent(slug)}`;
export const pageApi = {
  list: () => apiClient.get("/stores/me/pages"),
  get: (slug: string) => apiClient.get(pagePath(slug)),
  create: (title: string) => apiClient.post("/stores/me/pages", { title }),
  saveDraft: (slug: string, data: { title?: string; sections: unknown[] }) => apiClient.put(pagePath(slug), data),
  publish: (slug: string) => apiClient.post(`${pagePath(slug)}/publish`),
  delete: (slug: string) => apiClient.delete(pagePath(slug))
};

export const templateApi = {
  list: () => apiClient.get("/templates")
};

export const customerApi = {
  list: () => apiClient.get("/customers")
};

export const payoutApi = {
  balance: () => apiClient.get("/payouts/balance")
};

/** Uploads one image file and resolves to its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const res = await apiClient.post("/uploads", file, { headers: { "Content-Type": file.type || "application/octet-stream" } });
  return res.data.url;
}

/** Best human-readable message from an API error. */
export function errorMessage(err: any, fallback = "Something went wrong"): string {
  const data = err?.response?.data;
  const detail = data?.details?.[0];
  return (typeof detail === "string" ? detail : detail?.message) ?? data?.error ?? fallback;
}

// Dashboard API
export const dashboardApi = {
  getStats: () => apiClient.get("/dashboard/stats"),
};

export default apiClient;
