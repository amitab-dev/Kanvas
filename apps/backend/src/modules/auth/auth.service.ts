import type { FastifyRequest } from "fastify";
import { ApiError } from "../../utils/response";

/**
 * Reads the refresh token out of its cookie.
 *
 * The refresh token is deliberately cookie-only (never a header or body field)
 * so it cannot be read by client-side code the way the access token can.
 * Absence is treated as an auth failure rather than an empty string, so
 * callers never end up hashing "" and matching a stray row.
 */
export const readRefreshCookie = (req: FastifyRequest): string => {
    const refreshToken = req.cookies["kanvas_refresh_token"]
    if (!refreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }
    return refreshToken
}