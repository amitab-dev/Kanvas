import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as attachmentController from "./attachment.controller";
import {
    attachmentParamsSchema,
    cardAttachmentParamsSchema,
    createAttachmentSchema
} from "./attachment.types";

/** Collection routes, mounted under /api/cards/:cardId/attachments. */
export const cardAttachmentRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/",
        {
            schema: {
                params: cardAttachmentParamsSchema,
                body: createAttachmentSchema
            }
        },
        async (req, reply) => attachmentController.createAttachment(req, reply)
    )

    app.get(
        "/",
        {
            schema: {
                params: cardAttachmentParamsSchema
            }
        },
        async (req, reply) => attachmentController.listCardAttachments(req, reply)
    )
}

/** Item routes, mounted at /api/attachments. */
export const attachmentRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.delete(
        "/:id",
        {
            schema: {
                params: attachmentParamsSchema
            }
        },
        async (req, reply) => attachmentController.deleteAttachment(req, reply)
    )
}
