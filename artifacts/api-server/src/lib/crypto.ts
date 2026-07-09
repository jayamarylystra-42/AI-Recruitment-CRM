/**
 * Application-level encryption helpers for sensitive data at rest.
 * Uses AES-256-GCM (authenticated encryption) with a key derived from SESSION_SECRET.
 * The key derivation uses PBKDF2-SHA256 with a fixed salt so the same key is
 * produced deterministically from the same secret.
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

// Derive a stable key from SESSION_SECRET. Called once and cached.
let _cachedKey: Buffer | null = null;
function getDerivedKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for token encryption");
  // Fixed salt — the secret itself provides the entropy; the salt ensures
  // domain separation from any other PBKDF2 usage of the same secret.
  _cachedKey = crypto.pbkdf2Sync(
    secret,
    "outreach-gmail-token-v1",
    100_000,
    KEY_LENGTH,
    "sha256",
  );
  return _cachedKey;
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded blob:
 *   [12-byte IV][16-byte auth tag][ciphertext]
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt a blob produced by `encrypt`. Throws if the ciphertext is
 * tampered with (GCM auth tag mismatch).
 */
export function decrypt(cipherblob: string): string {
  const key = getDerivedKey();
  const data = Buffer.from(cipherblob, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
