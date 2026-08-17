import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as listController from "./list.controller";
import {
    boardListParamsSchema,
    createListSchema,
    listParamsSchema,
    moveListSchema,
    updateListSchema
} from "./list.types";

/**
 * Collection routes, mounted under /api/boards/:boardId/lists. A list only
 * exists inside a board, so creating and listing are board-scoped.
 */
export const boardListRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/",
        {
            schema: {
                params: boardListParamsSchema,
                body: createListSchema
            }
        },
        async (req, reply) => listController.createList(req, reply)
    )

    app.get(
        "/",
        {
            schema: {
                params: boardListParamsSchema
            }
        },
        async (req, reply) => listController.listBoardLists(req, reply)
    )
}

/**
 * Item routes, mounted at /api/lists. The board is resolved from the row, so
 * these do not repeat it in the path.
 */
export const listRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get(
        "/:id",
        {
            schema: {
                params: listParamsSchema
            }
        },
        async (req, reply) => listController.getList(req, reply)
    )

    app.patch(
        "/:id",
        {
            schema: {
                params: listParamsSchema,
                body: updateListSchema
            }
        },
        async (req, reply) => listController.updateList(req, reply)
    )

    app.patch(
        "/:id/move",
        {
            schema: {
                params: listParamsSchema,
                body: moveListSchema
            }
        },
        async (req, reply) => listController.moveList(req, reply)
    )

    app.delete(
        "/:id",
        {
            schema: {
                params: listParamsSchema
            }
        },
        async (req, reply) => listController.deleteList(req, reply)
    )
}
