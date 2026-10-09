import type { FastifyError, FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ApiError } from "../utils/response";

const errorHandlerPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.setErrorHandler((error: FastifyError, _req: FastifyRequest, reply: FastifyReply) => {
        app.log.error(error)

        if (error instanceof ApiError) {
            return reply.code(error.status).send({
                success: error.success,
                timestamp: new Date(Date.now()).toLocaleString(),
                message: error.message,
            })
        }

        if (error.statusCode && error.statusCode < 500) {
            return reply.code(error.statusCode).send({
                success: false,
                timestamp: new Date(Date.now()).toLocaleString(),
                message: error.message
            })
        }

        return reply.code(500).send({
            success: false,
            timestamp: new Date(Date.now()).toLocaleString(),
            message: "Internal Server Error"
        })
    })
}

export const errorHandler = fp(errorHandlerPlugin, { name: "error-handler" })