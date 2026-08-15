import Fastify from "fastify"
import sensible from "@fastify/sensible"
import {
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider
} from "fastify-type-provider-zod"
import databasePlugin from "./plugin/db"
import { authRoutes } from "./modules/auth/auth.route"
import { organizationRoutes } from "./modules/organization/organization.route"
import { userRoutes } from "./modules/user/user.routes"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import jwt from "@fastify/jwt"
import cookie from "@fastify/cookie"
import env from "./env"
import { errorHandler } from "./plugin/error-handler"
import authenticatePlugin from "./plugin/auth"

export default function bootstrap() {
    const app = Fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                }
            }
        }
    }).withTypeProvider<ZodTypeProvider>()

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    app.register(cors, {
        credentials: true,
        origin: env.NODE_ENV === "development" ? true : env.ORIGIN,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })

    app.register(helmet, {
        global: true
    })

    app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: {
            expiresIn: "15m"
        }
    })

    app.register(cookie, {
        secret: env.COOKIE_SECRET
    })

    app.register(sensible)

    app.register(databasePlugin)
    app.register(authenticatePlugin)
    
    app.register(errorHandler)

    app.register(authRoutes, { prefix: "/api/auth" })
    app.register(organizationRoutes, { prefix: "/api/organizations" })
    app.register(userRoutes, { prefix: "/api/users" })

    return app;
}
