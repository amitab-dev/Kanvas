import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as authController from "./auth.controller"
import { loginSchema, registerSchema } from "./auth.types";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
    app.post(
        "/register",
        {
            schema: {
                body: registerSchema
            }
        },
        async (req, reply) => authController.registerUser(req, reply)
    )

    app.post(
        "/login",
        {
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
        async (req, reply) => authController.refreshTokens(req, reply)
    )
}
