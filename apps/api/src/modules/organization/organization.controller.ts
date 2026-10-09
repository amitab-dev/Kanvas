import type { FastifyReply, FastifyRequest } from "fastify";
import { membersTable, organizationTable, usersTable } from "../../db/schema";
import { and, eq, or } from "drizzle-orm";
import { ApiError, ApiResponse } from "../../utils/response";
import {
    addMemberSchema,
    createOrganizationSchema,
    memberParamsSchema,
    organizationParamsSchema,
    updateOrganizationSchema
} from "./organization.types";
import { assertAdmin, assertMembership, findOrganization } from "./organization.service";
import { currentUserId } from "../../utils/request";

export const createOrganization = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = createOrganizationSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const existingOrganization = await db.query.organizationTable.findFirst({
        where: eq(organizationTable.slug, data.slug)
    });
    if (existingOrganization) {
        throw new ApiError(409, "Slug already taken");
    }

    const createdOrganization = await db.transaction(async (tx) => {
        const [organization] = await tx
            .insert(organizationTable)
            .values({
                name: data.name,
                slug: data.slug,
                adminId: userId
            })
            .returning();

        if (!organization) {
            throw new ApiError(500, "Failed to create organization");
        }

        // The admin is a member too, so board/member queries need only one path.
        await tx.insert(membersTable).values({
            organizationId: organization.id,
            userId
        });

        return organization;
    });

    return reply
        .code(201)
        .send(new ApiResponse(201, createdOrganization, "Organization created successfully"));
};

export const listOrganizations = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const organizations = await db
        .selectDistinct({
            id: organizationTable.id,
            name: organizationTable.name,
            slug: organizationTable.slug,
            adminId: organizationTable.adminId,
            createdAt: organizationTable.createdAt,
            updatedAt: organizationTable.updatedAt
        })
        .from(organizationTable)
        .leftJoin(membersTable, eq(membersTable.organizationId, organizationTable.id))
        .where(
            or(
                eq(organizationTable.adminId, userId),
                eq(membersTable.userId, userId)
            )
        );

    return reply
        .code(200)
        .send(new ApiResponse(200, organizations, "Organizations fetched successfully"));
};

export const getOrganization = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = organizationParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertMembership(db, data.id, userId);

    const organization = await db.query.organizationTable.findFirst({
        where: eq(organizationTable.id, data.id),
        with: {
            admin: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            },
            members: {
                with: {
                    user: {
                        columns: { id: true, fullName: true, email: true, avatar: true }
                    }
                }
            }
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, organization, "Organization fetched successfully"));
};

export const updateOrganization = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = organizationParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = updateOrganizationSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertAdmin(db, params.id, userId);

    if (data.slug) {
        const slugOwner = await db.query.organizationTable.findFirst({
            where: eq(organizationTable.slug, data.slug)
        });
        if (slugOwner && slugOwner.id !== params.id) {
            throw new ApiError(409, "Slug already taken");
        }
    }

    const [updatedOrganization] = await db
        .update(organizationTable)
        .set(data)
        .where(eq(organizationTable.id, params.id))
        .returning();

    return reply
        .code(200)
        .send(new ApiResponse(200, updatedOrganization, "Organization updated successfully"));
};

export const deleteOrganization = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = organizationParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertAdmin(db, data.id, userId);

    await db.delete(organizationTable).where(eq(organizationTable.id, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Organization deleted successfully"));
};

export const listMembers = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = organizationParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertMembership(db, data.id, userId);

    const members = await db
        .select({
            id: membersTable.id,
            userId: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
            avatar: usersTable.avatar,
            joinedAt: membersTable.createdAt
        })
        .from(membersTable)
        .innerJoin(usersTable, eq(usersTable.id, membersTable.userId))
        .where(eq(membersTable.organizationId, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, members, "Members fetched successfully"));
};

export const addMember = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = organizationParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = addMemberSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertAdmin(db, params.id, userId);

    const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, data.email),
        columns: { id: true, fullName: true, email: true, avatar: true }
    });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const existingMembership = await db.query.membersTable.findFirst({
        where: and(
            eq(membersTable.organizationId, params.id),
            eq(membersTable.userId, user.id)
        )
    });
    if (existingMembership) {
        throw new ApiError(409, "User is already a member of this organization");
    }

    const [membership] = await db
        .insert(membersTable)
        .values({
            organizationId: params.id,
            userId: user.id
        })
        .returning({
            id: membersTable.id,
            joinedAt: membersTable.createdAt
        });

    return reply
        .code(201)
        .send(new ApiResponse(201, { ...membership, user }, "Member added successfully"));
};

export const removeMember = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = memberParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const organization = await assertAdmin(db, data.id, userId);

    if (organization.adminId === data.userId) {
        throw new ApiError(400, "The organization admin cannot be removed");
    }

    const [removed] = await db
        .delete(membersTable)
        .where(
            and(
                eq(membersTable.organizationId, data.id),
                eq(membersTable.userId, data.userId)
            )
        )
        .returning({ id: membersTable.id });

    if (!removed) {
        throw new ApiError(404, "Member not found");
    }

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Member removed successfully"));
};

export const leaveOrganization = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = organizationParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const organization = await findOrganization(db, data.id);

    if (organization.adminId === userId) {
        throw new ApiError(400, "The organization admin cannot leave, transfer or delete it instead");
    }

    const [removed] = await db
        .delete(membersTable)
        .where(
            and(
                eq(membersTable.organizationId, data.id),
                eq(membersTable.userId, userId)
            )
        )
        .returning({ id: membersTable.id });

    if (!removed) {
        throw new ApiError(404, "You are not a member of this organization");
    }

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Left organization successfully"));
};
