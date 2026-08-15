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

const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.decorate("authenticate", async (req: FastifyRequest, _reply: FastifyReply) => {
        try {
            const authHeader = req.headers.authorization
            let token = authHeader?.split(" ")[1] || req.cookies["kanvas_access_token"]
            if (!token) {
                throw new ApiError(401, "Unauthorized access")
            }
            const authUser = req.server.jwt.decode(token) as AuthUser
            req.user = authUser.id
        } catch {
            throw new ApiError(401, "Unauthorized");
        }
    });
};

export default fp(authPlugin, { name: "authenticate" });
