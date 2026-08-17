import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as authController from "./auth.controller"
import { loginSchema, registerSchema } from "./auth.types";

/**
 * Mounted at /api/auth. Only /logout requires a valid access token; /refresh
 * authenticates on the refresh cookie alone, since it exists to be called once
 * the access token has already expired.
 */
export const authRoutes: FastifyPluginAsyncZod = async (app) => {
    const credentialRateLimit = {
        rateLimit: {
            max: 10,
            timeWindow: "1 minute"
        }
    }

    app.post(
        "/register",
        {
            config: credentialRateLimit,
            schema: {
                body: registerSchema
            }
        },
        async (req, reply) => authController.registerUser(req, reply)
    )

    app.post(
        "/login",
        {
            config: credentialRateLimit,
            schema: {
                body: loginSchema
            }
        },
        async (req, reply) => authController.loginUser(req, reply)
    )

    app.post(
        "/logout",
        {
            preHandler: [app.authenticate]
        },
        async (req, reply) => authController.logoutUser(req, reply)
    )

    app.post(
        "/refresh",
        {
            config: credentialRateLimit
        },
        async (req, reply) => authController.refreshTokens(req, reply)
    )
}
