import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as boardController from "./board.controller";
import {
    boardParamsSchema,
    createBoardSchema,
    organizationBoardParamsSchema,
    updateBoardSchema
} from "./board.types";

/**
 * Collection routes, mounted under /api/organizations/:organizationId/boards.
 * Creating and listing are org-scoped because a board only exists inside one.
 */
export const organizationBoardRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/",
        {
            schema: {
                params: organizationBoardParamsSchema,
                body: createBoardSchema
            }
        },
        async (req, reply) => boardController.createBoard(req, reply)
    )

    app.get(
        "/",
        {
            schema: {
                params: organizationBoardParamsSchema
            }
        },
        async (req, reply) => boardController.listOrganizationBoards(req, reply)
    )
}

/**
 * Item routes, mounted at /api/boards. A board id is globally unique, so these
 * do not repeat the organization in the path; the org is resolved from the row.
 */
export const boardRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get(
        "/:id",
        {
            schema: {
                params: boardParamsSchema
            }
        },
        async (req, reply) => boardController.getBoard(req, reply)
    )

    app.patch(
        "/:id",
        {
            schema: {
                params: boardParamsSchema,
                body: updateBoardSchema
            }
        },
        async (req, reply) => boardController.updateBoard(req, reply)
    )

    app.delete(
        "/:id",
        {
            schema: {
                params: boardParamsSchema
            }
        },
        async (req, reply) => boardController.deleteBoard(req, reply)
    )
}
