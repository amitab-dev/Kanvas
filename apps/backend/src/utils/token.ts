import crypto from "node:crypto"

export function generateRefreshToken() {
    return crypto.randomBytes(128).toString()
}

export function hashRefreshToken(refreshToken: string) {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
}