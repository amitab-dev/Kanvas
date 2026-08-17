import type { FastifyRequest } from "fastify";
import { ApiError } from "../../utils/response";
import env from "../../env";

/**
 * Options shared by both token cookies.
 *
 * `httpOnly` is the part that actually keeps a token out of reach of
 * client-side script; without it the refresh cookie is no safer than
 * localStorage. `secure` is relaxed outside production only because local
 * development is served over plain http, where a secure cookie is dropped.
 */
export const tokenCookieOptions = (maxAge: number) => ({
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
});

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