import argon2 from "argon2";

/**
 * Argon2id with OWASP-recommended-range parameters. Argon2id is used
 * (rather than argon2i/argon2d) because it resists both side-channel and
 * GPU/ASIC cracking attacks — the standard recommendation for password
 * hashing today.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash, algorithm mismatch, etc. — treat as verification failure,
    // never throw into the caller (which could leak internal state via timing/errors).
    return false;
  }
}

/** Same primitive, reused for hashing recovery codes and opaque tokens (reset/verification). */
export async function hashOpaqueSecret(secret: string): Promise<string> {
  return argon2.hash(secret, { type: argon2.argon2id, memoryCost: 12288, timeCost: 2, parallelism: 1 });
}

export async function verifyOpaqueSecret(hash: string, secret: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}
