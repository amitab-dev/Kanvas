import type { FastifyRequest } from "fastify";
import { ApiError } from "../../utils/response";

export const readRefreshCookie = (req: FastifyRequest): string => {
    const refreshToken = req.cookies["kanvas_refresh_token"]
    if (!refreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }
    return refreshToken
}