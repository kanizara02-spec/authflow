import { randomBytes } from "crypto";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";

const TRUSTED_DEVICE_TTL_MS = 60 * 24 * 3600_000; // 60 days

/** Issues a new trusted-device identifier, stored server-side and set as an HttpOnly cookie by the caller. */
export async function trustDevice(userId: string, deviceName: string) {
  const identifier = randomBytes(32).toString("base64url");
  const device = await prisma.trustedDevice.create({
    data: { userId, deviceIdentifier: identifier, deviceName, expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS) },
  });
  return { identifier, device };
}

export async function isTrustedDevice(userId: string, identifier: string | undefined): Promise<boolean> {
  if (!identifier) return false;
  const device = await prisma.trustedDevice.findUnique({ where: { deviceIdentifier: identifier } });
  if (!device || device.userId !== userId || device.revokedAt || device.expiresAt < new Date()) return false;
  await prisma.trustedDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
  return true;
}

export async function listDevices(userId: string) {
  return prisma.trustedDevice.findMany({ where: { userId, revokedAt: null }, orderBy: { lastSeenAt: "desc" } });
}

export async function revokeDevice(userId: string, deviceId: string) {
  const device = await prisma.trustedDevice.findUnique({ where: { id: deviceId } });
  if (!device || device.userId !== userId) throw Errors.notFound("Device");
  await prisma.trustedDevice.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });
}
