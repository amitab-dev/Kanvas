import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ApiError } from "../utils/response";

interface AuthUser {
    id: string,
    email: string,
    createdAt: Date
}

declare module "fastify" {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

/**
 * Decorates the app with `authenticate`, used as a route preHandler.
 *
 * On success `req.user` holds the user id as a bare string, not the decoded
 * payload; downstream code reads it through `currentUserId` in utils/request.
 */
const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.decorate("authenticate", async (req: FastifyRequest, _reply: FastifyReply) => {
        try {
            // Header wins over cookie so an explicit Authorization header can
            // override a stale cookie left in the browser.
            const authHeader = req.headers.authorization
            let token = authHeader?.split(" ")[1] || req.cookies["kanvas_access_token"]
            if (!token) {
                throw new ApiError(401, "Unauthorized access")
            }
            // `verify`, not `decode`: decoding only unpacks the payload, so an
            // unsigned or expired token would sail through and let anyone claim
            // any user id. This throws on a bad signature or a past `exp`.
            const authUser = req.server.jwt.verify<AuthUser>(token)
            req.user = authUser.id
        } catch {
            // Every failure collapses to one 401 so the response never says
            // whether a token was missing, malformed, or simply expired.
            throw new ApiError(401, "Unauthorized");
        }
    });
};

export default fp(authPlugin, { name: "authenticate" });
