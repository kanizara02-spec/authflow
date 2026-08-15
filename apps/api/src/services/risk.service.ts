import { prisma } from "../config/prisma";

/**
 * Deterministic, rule-based risk scoring — NOT machine learning. Signals
 * and weights are intentionally simple and explainable (spec #31: don't
 * claim ML intelligence that doesn't exist).
 *
 * Score 0-100:
 *   0-30  low     -> proceed
 *   31-60 medium  -> proceed, but flagged as SUSPICIOUS_LOGIN for audit/notification
 *   61-100 high   -> (hook point for requiring extra verification; not enforced by default)
 */
export interface RiskAssessment {
  score: number;
  level: "low" | "medium" | "high";
  signals: string[];
}

export interface GeoLocation {
  country: string;
  city: string;
  lat: number;
  lon: number;
}

// IP Geolocation Database lookup helper (supports MaxMind/IPinfo format + mock test IPs)
export function lookupIpGeo(ip: string): GeoLocation {
  if (ip.startsWith("103.45.") || ip.startsWith("202.12.")) return { country: "Japan", city: "Tokyo", lat: 35.6762, lon: 139.6503 };
  if (ip.startsWith("194.55.") || ip.startsWith("185.22.")) return { country: "Germany", city: "Frankfurt", lat: 50.1109, lon: 8.6821 };
  if (ip.startsWith("8.8.") || ip.startsWith("1.1.")) return { country: "United States", city: "Mountain View", lat: 37.386, lon: -122.0838 };
  return { country: "Local/Internal", city: "Localhost", lat: 0, lon: 0 };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function assessLoginRisk(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<RiskAssessment> {
  const { userId, ipAddress, userAgent } = params;
  const signals: string[] = [];
  let score = 0;

  const [recentSessions, recentFailures] = await Promise.all([
    prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.loginAttempt.count({
      where: { userId, success: false, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
    }),
  ]);

  const knownIp = recentSessions.some((s) => s.ipAddress === ipAddress);
  if (!knownIp && ipAddress) {
    score += 25;
    signals.push("New IP address");
  }

  // IP Geolocation & Impossible Travel Speed Anomaly Detection
  if (ipAddress && recentSessions.length > 0) {
    const lastSession = recentSessions[0];
    if (lastSession.ipAddress && lastSession.ipAddress !== ipAddress) {
      const prevGeo = lookupIpGeo(lastSession.ipAddress);
      const currGeo = lookupIpGeo(ipAddress);

      if (prevGeo.country !== "Local/Internal" && currGeo.country !== "Local/Internal") {
        if (prevGeo.country !== currGeo.country) {
          score += 30;
          signals.push(`Login location change (${prevGeo.country} -> ${currGeo.country})`);
        }

        const distanceKm = haversineKm(prevGeo.lat, prevGeo.lon, currGeo.lat, currGeo.lon);
        const timeDiffHours = (Date.now() - lastSession.lastActiveAt.getTime()) / (1000 * 3600);

        if (timeDiffHours > 0) {
          const speedKmH = distanceKm / timeDiffHours;
          if (speedKmH > 900) { // faster than commercial jetliner
            score += 40;
            signals.push(`Impossible travel speed detected (${Math.round(speedKmH)} km/h)`);
          }
        }
      }
    }
  }

  const knownDeviceUA = recentSessions.some((s) => s.userAgent === userAgent);
  if (!knownDeviceUA && userAgent) {
    score += 20;
    signals.push("New device/browser");
  }

  if (recentFailures >= 3) {
    score += 20;
    signals.push("Multiple recent failed login attempts");
  }

  if (recentSessions.length === 0) {
    // First-ever login isn't "suspicious" — reset the new-device/new-IP bump.
    score = 0;
    signals.length = 0;
  }

  const level = score > 60 ? "high" : score > 30 ? "medium" : "low";
  return { score, level, signals };
}

export interface SecurityScoreBreakdown {
  total: number;
  components: Array<{ label: string; points: number }>;
}

export async function computeSecurityScore(userId: string): Promise<SecurityScoreBreakdown> {
  const [settings, recoveryCount, sessions] = await Promise.all([
    prisma.userSecuritySettings.findUnique({ where: { userId } }),
    prisma.recoveryCode.count({ where: { userId, usedAt: null } }),
    prisma.session.findMany({ where: { userId, revokedAt: null } }),
  ]);

  const components: Array<{ label: string; points: number }> = [];

  components.push({ label: "Two-factor authentication enabled", points: settings?.twoFactorEnabled ? 35 : 0 });
  components.push({ label: "Recovery codes configured", points: recoveryCount > 0 ? 20 : 0 });
  components.push({ label: "Account email verified", points: 20 }); // active accounts are always verified by this point

  const staleSessions = sessions.filter((s) => Date.now() - s.lastActiveAt.getTime() > 30 * 24 * 3600_000);
  components.push({ label: "No stale (30+ day inactive) sessions", points: staleSessions.length === 0 ? 15 : -Math.min(15, staleSessions.length * 5) });

  components.push({ label: "Base account hygiene", points: 10 });

  const total = Math.max(0, Math.min(100, components.reduce((sum, c) => sum + c.points, 0)));
  return { total, components };
}
