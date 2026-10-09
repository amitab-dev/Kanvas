import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as organizationController from "./organization.controller";
import {
    addMemberSchema,
    createOrganizationSchema,
    memberParamsSchema,
    organizationParamsSchema,
    updateOrganizationSchema
} from "./organization.types";

export const organizationRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/",
        {
            schema: {
                body: createOrganizationSchema
            }
        },
        async (req, reply) => organizationController.createOrganization(req, reply)
    )

    app.get(
        "/",
        async (req, reply) => organizationController.listOrganizations(req, reply)
    )

    app.get(
        "/:id",
        {
            schema: {
                params: organizationParamsSchema
            }
        },
        async (req, reply) => organizationController.getOrganization(req, reply)
    )

    app.patch(
        "/:id",
        {
            schema: {
                params: organizationParamsSchema,
                body: updateOrganizationSchema
            }
        },
        async (req, reply) => organizationController.updateOrganization(req, reply)
    )

    app.delete(
        "/:id",
        {
            schema: {
                params: organizationParamsSchema
            }
        },
        async (req, reply) => organizationController.deleteOrganization(req, reply)
    )

    app.get(
        "/:id/members",
        {
            schema: {
                params: organizationParamsSchema
            }
        },
        async (req, reply) => organizationController.listMembers(req, reply)
    )

    app.post(
        "/:id/members",
        {
            schema: {
                params: organizationParamsSchema,
                body: addMemberSchema
            }
        },
        async (req, reply) => organizationController.addMember(req, reply)
    )

    app.delete(
        "/:id/members/:userId",
        {
            schema: {
                params: memberParamsSchema
            }
        },
        async (req, reply) => organizationController.removeMember(req, reply)
    )

    app.post(
        "/:id/leave",
        {
            schema: {
                params: organizationParamsSchema
            }
        },
        async (req, reply) => organizationController.leaveOrganization(req, reply)
    )
}
