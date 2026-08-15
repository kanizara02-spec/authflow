"use strict";
/**
 * Manual RFC 6238 (TOTP) / RFC 4226 (HOTP) implementation.
 *
 * This module exists to *prove* understanding of the algorithm and is
 * verified against the official RFC 6238 Appendix B test vectors in
 * totp.test.ts. It is NOT used as the sole production path in isolation —
 * see totp.service.ts in apps/api, which uses this module directly since
 * the algorithm itself is simple and auditable; there is no separate
 * "library" implementation to diverge from. Keeping the algorithm in one
 * small, heavily tested file is safer than depending on an opaque
 * third-party implementation for something this security-critical.
 *
 * Algorithm summary:
 *   T  = floor((unixTime - T0) / X)              time-step counter
 *   HS = HMAC-SHA1(K, T as 8-byte big-endian)     20-byte HMAC
 *   truncated = DynamicTruncate(HS)               31-bit int
 *   OTP = truncated mod 10^digits                 zero-padded decimal
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.base32Decode = base32Decode;
exports.base32Encode = base32Encode;
exports.hotp = hotp;
exports.timeStepCounter = timeStepCounter;
exports.totp = totp;
exports.verifyTotp = verifyTotp;
exports.buildOtpAuthUri = buildOtpAuthUri;
const crypto_1 = require("crypto");
const DEFAULTS = {
    digits: 6,
    period: 30,
    epoch: 0,
    algorithm: "sha1",
};
/** Decodes a Base32 (RFC 4648) secret, as used in otpauth:// URIs, into raw bytes. */
function base32Decode(input) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
    let bits = "";
    for (const char of clean) {
        const val = alphabet.indexOf(char);
        if (val === -1)
            throw new Error("Invalid base32 character in TOTP secret");
        bits += val.toString(2).padStart(5, "0");
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}
/** Encodes raw bytes as Base32 (RFC 4648), no padding stripped by default. */
function base32Encode(buf) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const byte of buf)
        bits += byte.toString(2).padStart(8, "0");
    let out = "";
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, "0");
        out += alphabet[parseInt(chunk, 2)];
    }
    while (out.length % 8 !== 0)
        out += "=";
    return out;
}
/** HOTP per RFC 4226: HMAC(K, counter) -> dynamic truncation -> N-digit decimal. */
function hotp(secret, counter, opts = {}) {
    const digits = opts.digits ?? DEFAULTS.digits;
    const algorithm = opts.algorithm ?? DEFAULTS.algorithm;
    const counterBuf = Buffer.alloc(8);
    let c = BigInt(counter);
    for (let i = 7; i >= 0; i--) {
        counterBuf[i] = Number(c & 0xffn);
        c >>= 8n;
    }
    const hmac = (0, crypto_1.createHmac)(algorithm, secret).update(counterBuf).digest();
    // Dynamic truncation (RFC 4226 section 5.3)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binCode = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    const otp = binCode % 10 ** digits;
    return otp.toString().padStart(digits, "0");
}
/** Computes the current TOTP time-step counter for a given unix time. */
function timeStepCounter(unixSeconds, opts = {}) {
    const period = opts.period ?? DEFAULTS.period;
    const epoch = opts.epoch ?? DEFAULTS.epoch;
    return Math.floor((unixSeconds - epoch) / period);
}
/** TOTP per RFC 6238: HOTP where the counter is derived from wall-clock time. */
function totp(secret, unixSeconds = Math.floor(Date.now() / 1000), opts = {}) {
    const counter = timeStepCounter(unixSeconds, opts);
    return hotp(secret, counter, opts);
}
/**
 * Verifies a submitted TOTP code against the current time window, allowing a
 * small clock-drift tolerance (+/- 1 step by default = +/- 30s).
 * Uses a constant-time comparison to avoid timing side-channels.
 * Caller is responsible for replay protection (rejecting a previously
 * consumed step) using `matchedStep` — see TotpService.
 */
function verifyTotp(secret, code, opts = {}, unixSeconds = Math.floor(Date.now() / 1000)) {
    const digits = opts.digits ?? DEFAULTS.digits;
    const window = opts.window ?? 1;
    if (!/^\d+$/.test(code) || code.length !== digits) {
        return { valid: false, matchedStep: null };
    }
    const currentCounter = timeStepCounter(unixSeconds, opts);
    const codeBuf = Buffer.from(code);
    for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
        const candidate = hotp(secret, currentCounter + errorWindow, opts);
        const candidateBuf = Buffer.from(candidate);
        if (candidateBuf.length === codeBuf.length && (0, crypto_1.timingSafeEqual)(candidateBuf, codeBuf)) {
            return { valid: true, matchedStep: currentCounter + errorWindow };
        }
    }
    return { valid: false, matchedStep: null };
}
/** Builds a standard otpauth:// provisioning URI compatible with Google/Microsoft Authenticator, Authy, etc. */
function buildOtpAuthUri(params) {
    const { secret, accountName, issuer, digits = 6, period = 30, algorithm = "SHA1" } = params;
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const query = new URLSearchParams({
        secret: base32Encode(secret),
        issuer,
        algorithm,
        digits: String(digits),
        period: String(period),
    });
    return `otpauth://totp/${label}?${query.toString()}`;
}
