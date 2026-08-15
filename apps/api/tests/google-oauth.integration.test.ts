import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { handleGoogleOAuthCallback } from "../src/services/googleOAuth.service";

const app = createApp();

async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) await prisma.user.delete({ where: { id: user.id } });
}

describe("Google OAuth Integration Suite", () => {
  const testEmail = `google-oauth-${Date.now()}@authflow.local`;

  afterAll(() => cleanupUser(testEmail));

  it("redirects to Google accounts OAuth authorization URL with state cookie", async () => {
    const res = await request(app).get("/api/auth/google");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(res.headers.location).toContain("client_id=");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("oauth_state="))).toBe(true);
  });

  it("handles denied consent gracefully when code is missing", async () => {
    const res = await request(app).get("/api/auth/google/callback?error=access_denied");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=Google%20consent%20denied");
  });

  it("rejects invalid state parameter on OAuth callback", async () => {
    const mockCtx = { ipAddress: "127.0.0.1", userAgent: "test-agent" };
    await expect(
      handleGoogleOAuthCallback("mock-code", "invalid-state", "real-state", mockCtx)
    ).rejects.toThrow("Invalid OAuth state parameter");
  });

  it("completes Google OAuth login flow and issues session cookies upon valid callback", async () => {
    const mockCtx = { ipAddress: "127.0.0.1", userAgent: "test-agent" };
    const state = "valid-mock-state-123";

    const result = await handleGoogleOAuthCallback(
      "valid-mock-code",
      state,
      state,
      mockCtx,
      async () => ({
        id: "google-uid-12345",
        email: testEmail,
        name: "Google Test User",
      })
    );

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.sessionId).toBeDefined();

    const createdUser = await prisma.user.findUniqueOrThrow({ where: { email: testEmail } });
    expect(createdUser.status).toBe("ACTIVE");
    expect(createdUser.emailVerifiedAt).not.toBeNull();
  });
});
