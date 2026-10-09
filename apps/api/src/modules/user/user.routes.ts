import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as userController from "./user.controller";
import {
    changePasswordSchema,
    deleteAccountSchema,
    searchUsersSchema,
    updateProfileSchema,
    userParamsSchema
} from "./user.types";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get(
        "/me",
        async (req, reply) => userController.getCurrentUser(req, reply)
    )

    app.patch(
        "/me",
        {
            schema: {
                body: updateProfileSchema
            }
        },
        async (req, reply) => userController.updateCurrentUser(req, reply)
    )

    app.patch(
        "/me/password",
        {
            schema: {
                body: changePasswordSchema
            }
        },
        async (req, reply) => userController.changePassword(req, reply)
    )

    app.delete(
        "/me",
        {
            schema: {
                body: deleteAccountSchema
            }
        },
        async (req, reply) => userController.deleteCurrentUser(req, reply)
    )

    app.get(
        "/me/organizations",
        async (req, reply) => userController.listUserOrganizations(req, reply)
    )

    app.get(
        "/search",
        {
            schema: {
                querystring: searchUsersSchema
            }
        },
        async (req, reply) => userController.searchUsers(req, reply)
    )

    app.get(
        "/:id",
        {
            schema: {
                params: userParamsSchema
            }
        },
        async (req, reply) => userController.getUser(req, reply)
    )
}
