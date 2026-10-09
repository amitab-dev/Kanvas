import type { FastifyReply, FastifyRequest } from "fastify";
import { membersTable, tokensTable, usersTable } from "../../db/schema";
import { and, eq, ilike, ne, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { ApiError, ApiResponse } from "../../utils/response";
import { currentUserId } from "../../utils/request";
import {
    changePasswordSchema,
    deleteAccountSchema,
    searchUsersSchema,
    updateProfileSchema,
    userParamsSchema
} from "./user.types";
import { assertSharesOrganization, findUserOrThrow, publicUserColumns } from "./user.service";

export const getCurrentUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
        columns: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatar: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return reply
        .code(200)
        .send(new ApiResponse(200, user, "Profile fetched successfully"));
};

export const updateCurrentUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = updateProfileSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const [updatedUser] = await db
        .update(usersTable)
        .set(data)
        .where(eq(usersTable.id, userId))
        .returning({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
            role: usersTable.role,
            avatar: usersTable.avatar,
            createdAt: usersTable.createdAt,
            updatedAt: usersTable.updatedAt
        });

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return reply
        .code(200)
        .send(new ApiResponse(200, updatedUser, "Profile updated successfully"));
};

export const changePassword = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = changePasswordSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const user = await findUserOrThrow(db, userId);

    // Accounts created through a provider have no password to compare against.
    if (!user.password) {
        throw new ApiError(400, "This account has no password set");
    }

    const passwordMatches = await bcrypt.compare(data.currentPassword, user.password);
    if (!passwordMatches) {
        throw new ApiError(401, "Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 12);

    // Changing the password logs every other session out.
    await db.transaction(async (tx) => {
        await tx
            .update(usersTable)
            .set({ password: hashedPassword })
            .where(eq(usersTable.id, userId));

        await tx
            .update(tokensTable)
            .set({ revoked: true })
            .where(eq(tokensTable.userId, userId));
    });

    return reply
        .code(200)
        .clearCookie("kanvas_access_token")
        .clearCookie("kanvas_refresh_token")
        .send(new ApiResponse(200, null, "Password changed successfully, please log in again"));
};

export const deleteCurrentUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = deleteAccountSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const user = await findUserOrThrow(db, userId);

    if (!user.password) {
        throw new ApiError(400, "This account has no password set");
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) {
        throw new ApiError(401, "Password is incorrect");
    }

    // Every organization this user admins cascades away with them.
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    return reply
        .code(200)
        .clearCookie("kanvas_access_token")
        .clearCookie("kanvas_refresh_token")
        .send(new ApiResponse(200, null, "Account deleted successfully"));
};

export const getUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = userParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    if (data.id !== userId) {
        await assertSharesOrganization(db, userId, data.id);
    }

    const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, data.id),
        columns: publicUserColumns
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return reply
        .code(200)
        .send(new ApiResponse(200, user, "User fetched successfully"));
};

export const searchUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = searchUsersSchema.safeParse(req.query);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const term = `%${data.q}%`;

    const users = await db
        .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
            avatar: usersTable.avatar
        })
        .from(usersTable)
        .where(
            and(
                ne(usersTable.id, userId),
                or(
                    ilike(usersTable.email, term),
                    ilike(usersTable.fullName, term)
                )
            )
        )
        .limit(data.limit);

    return reply
        .code(200)
        .send(new ApiResponse(200, users, "Users fetched successfully"));
};

export const listUserOrganizations = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const memberships = await db.query.membersTable.findMany({
        where: eq(membersTable.userId, userId),
        with: {
            organization: true
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, memberships.map((m) => m.organization), "Organizations fetched successfully"));
};
