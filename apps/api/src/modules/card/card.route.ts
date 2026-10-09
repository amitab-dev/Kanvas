import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as cardController from "./card.controller";
import {
    cardParamsSchema,
    createCardSchema,
    listCardParamsSchema,
    listCardsQuerySchema,
    moveCardSchema,
    updateCardSchema
} from "./card.types";

/** Collection routes, mounted under /api/lists/:listId/cards. */
export const listCardRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/",
        {
            schema: {
                params: listCardParamsSchema,
                body: createCardSchema
            }
        },
        async (req, reply) => cardController.createCard(req, reply)
    )

    app.get(
        "/",
        {
            schema: {
                params: listCardParamsSchema,
                querystring: listCardsQuerySchema
            }
        },
        async (req, reply) => cardController.listCards(req, reply)
    )
}

/**
 * Item routes, mounted at /api/cards. `move` is separate from the general
 * update because it also rewrites ordering, which a field patch should not.
 */
export const cardRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get(
        "/:id",
        {
            schema: {
                params: cardParamsSchema
            }
        },
        async (req, reply) => cardController.getCard(req, reply)
    )

    app.patch(
        "/:id",
        {
            schema: {
                params: cardParamsSchema,
                body: updateCardSchema
            }
        },
        async (req, reply) => cardController.updateCard(req, reply)
    )

    app.patch(
        "/:id/move",
        {
            schema: {
                params: cardParamsSchema,
                body: moveCardSchema
            }
        },
        async (req, reply) => cardController.moveCard(req, reply)
    )

    app.delete(
        "/:id",
        {
            schema: {
                params: cardParamsSchema
            }
        },
        async (req, reply) => cardController.deleteCard(req, reply)
    )
}
