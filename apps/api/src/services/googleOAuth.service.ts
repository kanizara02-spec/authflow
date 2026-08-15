import { generateOpaqueToken } from "@authflow/security";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { createSession } from "./session.service";
import { issueAccessToken } from "./token.service";
import { recordSecurityEvent } from "./audit.service";
import { SecurityEventType } from "@authflow/shared";
import type { RequestContext } from "../utils/requestContext";
import { Errors } from "../utils/errors";

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export function buildGoogleAuthUrl(state: string): string {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    client_id: env.GOOGLE_CLIENT_ID || "mock-google-client-id",
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state,
  };

  const qs = new URLSearchParams(options).toString();
  return `${rootUrl}?${qs}`;
}

export async function handleGoogleOAuthCallback(
  code: string,
  state: string,
  expectedState: string,
  ctx: RequestContext,
  fetchGoogleProfileOverride?: (code: string) => Promise<GoogleProfile>
) {
  if (!state || !expectedState || state !== expectedState) {
    throw Errors.unauthorized("Invalid OAuth state parameter");
  }

  let profile: GoogleProfile;
  if (fetchGoogleProfileOverride) {
    profile = await fetchGoogleProfileOverride(code);
  } else {
    // Standard OAuth token exchange with Google
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID || "",
          client_secret: env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = (await tokenRes.json()) as { access_token?: string; id_token?: string; error?: string };
      if (!tokenRes.ok || !tokenData.access_token) {
        throw Errors.unauthorized(tokenData.error || "Failed to exchange Google authorization code");
      }

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = (await userRes.json()) as { id: string; email: string; name: string; picture?: string };

      if (!userData.email) {
        throw Errors.unauthorized("Google profile did not return an email address");
      }

      profile = {
        id: userData.id,
        email: userData.email.toLowerCase(),
        name: userData.name || userData.email.split("@")[0],
        picture: userData.picture,
      };
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode) throw err;
      throw Errors.unauthorized("Google authentication failed");
    }
  }

  // Match existing user account or create new user on first Google login
  let user = await userRepository.findByEmail(profile.email);
  if (!user) {
    const dummyPasswordHash = `$argon2id$v=19$m=65536,t=3,p=4$${generateOpaqueToken()}$${generateOpaqueToken()}`;
    user = await userRepository.create({
      fullName: profile.name,
      email: profile.email,
      passwordHash: dummyPasswordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    });
    await recordSecurityEvent({ userId: user.id, type: SecurityEventType.USER_REGISTERED, notify: false });
  } else if (user.status === "PENDING_VERIFICATION") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });
  }

  if (user.status === "DISABLED") {
    throw Errors.accountDisabled();
  }

  // 2FA Enforcement: Google login MUST NOT bypass 2FA if active
  if (user.securitySettings?.twoFactorEnabled) {
    await recordSecurityEvent({ userId: user.id, type: SecurityEventType.LOGIN_CHALLENGE_ISSUED, ctx, notify: false });
    return { status: "TOTP_REQUIRED" as const, challengeToken: issueChallengeToken(user.id) };
  }

  const { session, refreshToken } = await createSession(user.id, ctx);
  const accessToken = issueAccessToken({ sub: user.id, role: user.role as "USER" | "ADMIN", sid: session.id });

  await recordSecurityEvent({ userId: user.id, type: SecurityEventType.LOGIN_SUCCESS, ctx });

  return { status: "AUTHENTICATED" as const, accessToken, refreshToken, sessionId: session.id };
}
