/**
 * OpenAPI document served at /docs (Swagger UI). This covers the full
 * public API surface with request/response shapes, auth requirements, and
 * rate limits. Kept as a typed object (rather than YAML) so it can import
 * shared response types later if desired.
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "AuthFlow API",
    version: "1.0.0",
    description:
      "Secure identity & two-factor authentication platform. All cookies are HttpOnly; the /api/auth and /api/security routes drive the login and account-security UI.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
          },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new account",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "email", "password", "confirmPassword"],
                properties: {
                  fullName: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 12 },
                  confirmPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registration accepted (generic response regardless of whether the email was already registered)" },
          "422": { description: "Password does not meet policy", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Log in with email + password",
        tags: ["Auth"],
        description: "Rate limited to 5 attempts / 15 minutes per IP+email. Returns TOTP_REQUIRED with a challenge token if 2FA is enabled, otherwise sets session cookies directly.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } },
        },
        responses: {
          "200": { description: "AUTHENTICATED (cookies set) or TOTP_REQUIRED (challengeToken returned)" },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/auth/verify-2fa": {
      post: {
        summary: "Complete login with a TOTP code",
        tags: ["Auth"],
        description: "Rate limited to 5 attempts / 5 minutes.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["challengeToken", "code"], properties: { challengeToken: { type: "string" }, code: { type: "string", pattern: "^[0-9]{6}$" } } } } } },
        responses: { "200": { description: "AUTHENTICATED" }, "401": { description: "Invalid or expired code" } },
      },
    },
    "/auth/recovery/verify": {
      post: {
        summary: "Complete login with a recovery code",
        tags: ["Auth"],
        responses: { "200": { description: "AUTHENTICATED" }, "401": { description: "Invalid or already-used code" } },
      },
    },
    "/auth/refresh": { post: { summary: "Rotate refresh token / issue new access token", tags: ["Auth"], responses: { "200": { description: "REFRESHED" }, "401": { description: "Invalid/expired/reused token — reuse revokes the whole session family" } } } },
    "/auth/logout": { post: { summary: "Log out the current session", tags: ["Auth"], security: [{ cookieAuth: [] }] } },
    "/auth/forgot-password": { post: { summary: "Request a password reset email", tags: ["Auth"], description: "Always returns a generic success response to avoid account enumeration." } },
    "/auth/reset-password": { post: { summary: "Reset password using a reset token", tags: ["Auth"], description: "Invalidates all existing sessions on success." } },
    "/auth/change-password": { post: { summary: "Change password (requires current password)", tags: ["Auth"], security: [{ cookieAuth: [] }] } },
    "/auth/me": { get: { summary: "Current authenticated user", tags: ["Auth"], security: [{ cookieAuth: [] }] } },

    "/security/2fa/setup": { post: { summary: "Begin TOTP enrollment (returns QR code + otpauth URI)", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/2fa/verify": { post: { summary: "Confirm enrollment with first TOTP code; activates 2FA and returns recovery codes ONCE", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/2fa/disable": { post: { summary: "Disable 2FA (requires password + current TOTP code)", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/recovery/regenerate": { post: { summary: "Regenerate recovery codes (requires password + TOTP)", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/sessions": { get: { summary: "List active sessions", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/sessions/{id}": { delete: { summary: "Revoke a session", tags: ["Security"], security: [{ cookieAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] } },
    "/security/sessions/revoke-others": { post: { summary: "Sign out of all other sessions", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/devices": { get: { summary: "List trusted devices", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/devices/{id}": { delete: { summary: "Revoke a trusted device", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/notifications": { get: { summary: "List security notifications", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/events": { get: { summary: "List audit/security events for the current user", tags: ["Security"], security: [{ cookieAuth: [] }] } },
    "/security/score": { get: { summary: "Compute the account security score", tags: ["Security"], security: [{ cookieAuth: [] }] } },

    "/admin/security/overview": { get: { summary: "Aggregate security metrics (admin only)", tags: ["Admin"], security: [{ cookieAuth: [] }] } },
    "/admin/security/events": { get: { summary: "Recent security events across all users (admin only)", tags: ["Admin"], security: [{ cookieAuth: [] }] } },
    "/admin/users": { get: { summary: "List users, metadata only — never secrets (admin only)", tags: ["Admin"], security: [{ cookieAuth: [] }] } },
  },
};
