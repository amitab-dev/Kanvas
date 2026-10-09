import { membersTable, usersTable } from "../../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";

/** Fields safe to expose about somebody other than the requester. */
export const publicUserColumns = {
    id: true,
    fullName: true,
    email: true,
    avatar: true,
    createdAt: true
} as const;

export const findUserOrThrow = async (db: Database, userId: string) => {
    const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId)
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return user;
};

/**
 * Profiles are only visible between people who share an organization, so an
 * authenticated user cannot walk the whole user table by id.
 */
export const assertSharesOrganization = async (db: Database, userId: string, targetId: string) => {
    const myOrganizations = await db
        .select({ organizationId: membersTable.organizationId })
        .from(membersTable)
        .where(eq(membersTable.userId, userId));

    if (myOrganizations.length === 0) {
        throw new ApiError(403, "You do not have access to this user");
    }

    const shared = await db.query.membersTable.findFirst({
        where: and(
            eq(membersTable.userId, targetId),
            inArray(membersTable.organizationId, myOrganizations.map((o) => o.organizationId))
        )
    });

    if (!shared) {
        throw new ApiError(403, "You do not have access to this user");
    }

    return shared;
};
