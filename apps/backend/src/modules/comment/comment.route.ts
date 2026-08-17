import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as commentController from "./comment.controller";
import {
    cardCommentParamsSchema,
    commentParamsSchema,
    createCommentSchema
} from "./comment.types";

/** Collection routes, mounted under /api/cards/:cardId/comments. */
export const cardCommentRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/",
        {
            schema: {
                params: cardCommentParamsSchema,
                body: createCommentSchema
            }
        },
        async (req, reply) => commentController.createComment(req, reply)
    )

    app.get(
        "/",
        {
            schema: {
                params: cardCommentParamsSchema
            }
        },
        async (req, reply) => commentController.listCardComments(req, reply)
    )
}

/**
 * Item routes, mounted at /api/comments. There is no edit route: the comments
 * table has no `updated_at`, so an edited comment would be indistinguishable
 * from the original.
 */
export const commentRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.delete(
        "/:id",
        {
            schema: {
                params: commentParamsSchema
            }
        },
        async (req, reply) => commentController.deleteComment(req, reply)
    )
}
