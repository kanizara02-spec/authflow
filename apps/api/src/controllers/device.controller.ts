import type { Request, Response, NextFunction } from "express";
import { SecurityEventType } from "@authflow/shared";
import * as deviceService from "../services/device.service";
import { recordSecurityEvent } from "../services/audit.service";
import { Errors } from "../utils/errors";

export async function listDevices(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    const devices = await deviceService.listDevices(req.user.id);
    res.json({ success: true, data: devices.map((d) => ({ id: d.id, deviceName: d.deviceName, lastSeenAt: d.lastSeenAt, createdAt: d.createdAt, expiresAt: d.expiresAt })) });
  } catch (err) {
    next(err);
  }
}

export async function revokeDevice(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.unauthorized());
    await deviceService.revokeDevice(req.user.id, req.params.id);
    await recordSecurityEvent({ userId: req.user.id, type: SecurityEventType.TRUSTED_DEVICE_REVOKED, metadata: { deviceId: req.params.id }, notify: false });
    res.json({ success: true, data: { message: "Device revoked." } });
  } catch (err) {
    next(err);
  }
}
