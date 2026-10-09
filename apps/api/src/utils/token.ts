import crypto from "node:crypto"

/**
 * Mints the opaque refresh token handed to the client.
 *
 * The hex encoding is load-bearing: `toString()` with no argument reads the
 * bytes as UTF-8, which collapses every invalid sequence into the replacement
 * character and throws away most of the entropy the token depends on.
 */
export function generateRefreshToken() {
    return crypto.randomBytes(128).toString("hex")
}

/**
 * Hashes a refresh token for storage and lookup.
 *
 * Plain SHA-256 with no salt is deliberate: the token is already long random
 * data, so it needs no stretching, and the hash must stay deterministic for
 * `where refresh_token = ...` to find the row.
 */
export function hashRefreshToken(refreshToken: string) {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
}