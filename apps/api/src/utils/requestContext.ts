import type { Request } from "express";
import { UAParser } from "ua-parser-js";

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceName: string;
}

export function getRequestContext(req: Request): RequestContext {
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  // req.ip respects Express's `trust proxy` setting (configured in index.ts)
  // so this reflects the real client IP behind a load balancer, not the proxy's.
  const ipAddress = req.ip ?? "unknown";

  return {
    ipAddress,
    userAgent,
    browser: [browser.name, browser.version].filter(Boolean).join(" ") || "Unknown browser",
    os: [os.name, os.version].filter(Boolean).join(" ") || "Unknown OS",
    deviceName: device.vendor && device.model ? `${device.vendor} ${device.model}` : device.type ?? "Desktop",
  };
}

/** Privacy-conscious display form of an IP (masks the last octet/segment). Storage keeps the full IP for abuse investigation; display uses this. */
export function maskIp(ip: string): string {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.xxx` : ip;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + ":xxxx:xxxx:xxxx:xxxx";
  }
  return ip;
}
