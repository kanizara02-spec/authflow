import { api } from "./client";

export interface Me {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

export const authApi = {
  register: (data: { fullName: string; email: string; password: string; confirmPassword: string }) =>
    api.post("/api/auth/register", data).then((r) => r.data),

  verifyEmail: (token: string) => api.post("/api/auth/verify-email", { token }).then((r) => r.data),

  login: (data: { email: string; password: string }) => api.post("/api/auth/login", data).then((r) => r.data),

  verify2fa: (data: { challengeToken: string; code: string }) =>
    api.post("/api/auth/verify-2fa", data).then((r) => r.data),

  verifyRecovery: (data: { challengeToken: string; recoveryCode: string }) =>
    api.post("/api/auth/recovery/verify", data).then((r) => r.data),

  logout: () => api.post("/api/auth/logout").then((r) => r.data),

  forgotPassword: (email: string) => api.post("/api/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (data: { token: string; newPassword: string; confirmPassword: string }) =>
    api.post("/api/auth/reset-password", data).then((r) => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.post("/api/auth/change-password", data).then((r) => r.data),

  me: (): Promise<{ success: true; data: Me }> => api.get("/api/auth/me").then((r) => r.data),
};

export const securityApi = {
  setup2fa: () => api.post("/api/security/2fa/setup").then((r) => r.data),
  verify2faSetup: (code: string) => api.post("/api/security/2fa/verify", { code }).then((r) => r.data),
  disable2fa: (data: { currentPassword: string; code: string }) =>
    api.post("/api/security/2fa/disable", data).then((r) => r.data),
  regenerateRecoveryCodes: (data: { currentPassword: string; code: string }) =>
    api.post("/api/security/recovery/regenerate", data).then((r) => r.data),

  listSessions: () => api.get("/api/security/sessions").then((r) => r.data),
  revokeSession: (id: string) => api.delete(`/api/security/sessions/${id}`).then((r) => r.data),
  revokeOtherSessions: () => api.post("/api/security/sessions/revoke-others").then((r) => r.data),

  listDevices: () => api.get("/api/security/devices").then((r) => r.data),
  revokeDevice: (id: string) => api.delete(`/api/security/devices/${id}`).then((r) => r.data),

  listNotifications: () => api.get("/api/security/notifications").then((r) => r.data),
  listEvents: () => api.get("/api/security/events").then((r) => r.data),
  getScore: () => api.get("/api/security/score").then((r) => r.data),
};

export const adminApi = {
  overview: () => api.get("/api/admin/security/overview").then((r) => r.data),
  events: () => api.get("/api/admin/security/events").then((r) => r.data),
  users: () => api.get("/api/admin/users").then((r) => r.data),
};
