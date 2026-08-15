import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320).toLowerCase(),
    password: z.string().min(1).max(256), // policy enforcement happens in service (shared PASSWORD_POLICY), not here
    confirmPassword: z.string().min(1).max(256),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(320).toLowerCase(),
    password: z.string().min(1).max(256),
  }),
});

export const verify2faSchema = z.object({
  body: z.object({
    challengeToken: z.string().min(1),
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  }),
});

export const verifyRecoverySchema = z.object({
  body: z.object({
    challengeToken: z.string().min(1),
    recoveryCode: z.string().min(1).max(64),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().email().max(320).toLowerCase() }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(1).max(256),
    confirmPassword: z.string().min(1).max(256),
  }).refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(1).max(256),
    confirmPassword: z.string().min(1).max(256),
  }).refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});

export const setup2faVerifySchema = z.object({
  body: z.object({ code: z.string().regex(/^\d{6}$/, "Code must be 6 digits") }),
});

export const disable2faSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(256),
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  }),
});

export const regenerateRecoveryCodesSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(256),
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  }),
});

export const emailVerifySchema = z.object({
  body: z.object({ token: z.string().min(1) }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const deviceIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const requestEmailChangeSchema = z.object({
  body: z.object({
    newEmail: z.string().trim().email().max(320).toLowerCase(),
    currentPassword: z.string().min(1).max(256),
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits").optional(),
  }),
});

export const confirmEmailChangeSchema = z.object({
  body: z.object({ token: z.string().min(1) }),
});
