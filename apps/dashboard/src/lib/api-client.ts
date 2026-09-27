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
  getBySlug: (slug: string) => apiClient.get(`/stores/${slug}`)
};

// Dashboard API
export const dashboardApi = {
  getStats: () => apiClient.get("/dashboard/stats"),
};

export default apiClient;
