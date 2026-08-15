# How TOTP works in AuthFlow

AuthFlow implements Time-based One-Time Passwords per **RFC 6238**, built
on HOTP (**RFC 4226**). This document explains the algorithm end to end —
detailed enough to explain in a technical interview — and points to where
each step lives in code.

## The chain

```
Shared Secret (random, 160-bit)
        │
        ▼
Unix Timestamp (current time, seconds since epoch)
        │
        ▼
30-second Time Step  →  T = floor((unixTime - T0) / X),  T0=0, X=30
        │
        ▼
Counter (T, as an 8-byte big-endian integer)
        │
        ▼
HMAC-SHA1(secret, counter)  →  20-byte HMAC digest
        │
        ▼
Dynamic Truncation  →  extracts a 31-bit integer from the digest
        │
        ▼
6-Digit OTP  =  truncated value mod 10^6, zero-padded
```

## Step by step

1. **Shared secret.** Generated server-side with a CSPRNG
   (`generateTotpSecret`, 20 random bytes = 160 bits). Encoded as Base32 for
   the `otpauth://` URI, since that's what authenticator apps expect.

2. **Unix timestamp.** Both the server and the authenticator app compute
   the OTP from the *current* wall-clock time — no round trip is needed,
   which is what makes TOTP usable offline.

3. **Time-step counter.** `T = floor((currentUnixTime - T0) / X)`. With
   `T0 = 0` and `X = 30` seconds, this produces a new counter value every 30
   seconds — the number displayed in an authenticator app just before it
   refreshes.

4. **HMAC generation.** The counter is encoded as an 8-byte big-endian
   integer and used as the HMAC message, with the shared secret as the
   HMAC key: `HMAC-SHA1(K, counter)`. SHA-1 is used (not a stronger hash)
   specifically because that's what the RFC and every mainstream
   authenticator app (Google Authenticator, Microsoft Authenticator, Authy)
   expects — using SHA-256 would break compatibility.

5. **Dynamic truncation** (RFC 4226 §5.3). Take the low 4 bits of the last
   byte of the HMAC as an offset, then read 4 bytes starting at that offset,
   masking the top bit to keep the result a positive 31-bit integer. This
   avoids bias from always reading the same bytes of the HMAC.

6. **Decimal conversion.** `truncatedValue mod 10^6` yields a value from 0
   to 999,999, zero-padded to 6 digits.

## Where this lives in code

- `packages/security/src/totp.ts` — the algorithm itself (`hotp`, `totp`,
  `verifyTotp`, Base32 encode/decode, `otpauth://` URI builder). This is a
  **from-scratch implementation**, not a wrapper around a third-party TOTP
  library — written specifically to demonstrate the algorithm, and verified
  against the **official RFC 6238 Appendix B and RFC 4226 Appendix D test
  vectors** in `packages/security/src/totp.test.ts`. Every vector passes.
- `apps/api/src/services/totp.service.ts` — wires the algorithm into the
  database: encrypts the secret at rest (AES-256-GCM), enforces the
  "enrollment isn't active until first successful verification" rule, and
  implements replay protection by tracking the last accepted time-step per
  user.

## Verification tolerance (clock drift)

Phone clocks and server clocks drift slightly. AuthFlow checks the current
time-step **and one step before/after** (`window: 1`), i.e. it accepts a
code from -30s, now, or +30s. This is a deliberate, bounded tolerance —
*not* "accept any recent code" — and combined with replay protection
(rejecting anything at or before the last accepted step), a captured code
still can't be reused even within that window.

## Why HMAC-SHA1 isn't a weakness here

TOTP's security doesn't come from SHA-1's collision resistance (irrelevant
for a MAC) — it comes from the secrecy of the shared key and the short
validity window of each code. HMAC-SHA1 remains the interoperable standard
for TOTP specifically; this is a compatibility decision, not a security
compromise.
