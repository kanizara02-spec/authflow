import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  withCredentials: true, // send/receive HttpOnly cookies
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

/**
 * On a 401 from any authenticated endpoint (except the refresh/login
 * endpoints themselves), attempt exactly one silent refresh via the
 * refresh-token cookie, then retry the original request. If the refresh
 * itself fails (expired/revoked/reused token), the caller's normal error
 * handling takes over and the app routes to /login.
 */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url ?? "";

    if (status === 401 && !original._retry && !url.includes("/auth/refresh") && !url.includes("/auth/login")) {
      original._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return api(original);
      }

      isRefreshing = true;
      try {
        await api.post("/api/auth/refresh");
        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];
        return api(original);
      } catch (refreshError) {
        pendingQueue = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiErrorShape {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export function extractApiError(err: unknown): { code: string; message: string } {
  const anyErr = err as any;
  const data = anyErr?.response?.data as ApiErrorShape | undefined;
  if (data?.error) return data.error;
  return { code: "NETWORK_ERROR", message: "Couldn't reach the server. Please check your connection." };
}
