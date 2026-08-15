import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { assessLoginRisk, lookupIpGeo, haversineKm } from "../src/services/risk.service";
import { createSession } from "../src/services/session.service";

describe("IP Geolocation & Anomaly Detection Suite", () => {
  const testEmail = `risk-user-${Date.now()}@authflow.local`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        fullName: "Risk Test User",
        email: testEmail,
        passwordHash: await hashPassword("StrongPass!123"),
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it("correctly maps IP addresses to geographical coordinates and countries", () => {
    const geoTokyo = lookupIpGeo("103.45.1.10");
    expect(geoTokyo.country).toBe("Japan");
    expect(geoTokyo.city).toBe("Tokyo");

    const geoFrankfurt = lookupIpGeo("194.55.20.5");
    expect(geoFrankfurt.country).toBe("Germany");
    expect(geoFrankfurt.city).toBe("Frankfurt");
  });

  it("calculates haversine distance between Tokyo and Frankfurt", () => {
    const tokio = lookupIpGeo("103.45.1.10");
    const frankfurt = lookupIpGeo("194.55.20.5");
    const distance = haversineKm(tokio.lat, tokio.lon, frankfurt.lat, frankfurt.lon);
    expect(distance).toBeGreaterThan(9000); // ~9300 km
  });

  it("detects impossible travel speed between consecutive logins", async () => {
    // 1. First session in Tokyo (Japan)
    await createSession(userId, {
      ipAddress: "103.45.1.10",
      userAgent: "Browser-Tokyo",
    });

    // 2. Second login 5 minutes later from Frankfurt (Germany) -> ~9300 km in 5 mins = ~111,000 km/h
    const risk = await assessLoginRisk({
      userId,
      ipAddress: "194.55.20.5",
      userAgent: "Browser-Frankfurt",
    });

    expect(risk.score).toBeGreaterThanOrEqual(60);
    expect(risk.level).toBe("high");
    expect(risk.signals.some((s) => s.includes("Impossible travel speed"))).toBe(true);
    expect(risk.signals.some((s) => s.includes("Login location change"))).toBe(true);
  });
});
