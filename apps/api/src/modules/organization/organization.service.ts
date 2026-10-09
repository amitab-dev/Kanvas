import { membersTable, organizationTable } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";

export const findOrganization = async (db: Database, organizationId: string) => {
    const organization = await db.query.organizationTable.findFirst({
        where: eq(organizationTable.id, organizationId)
    });

    if (!organization) {
        throw new ApiError(404, "Organization not found");
    }

    return organization;
};

/** Admins and members may read; anyone else gets a 403. */
export const assertMembership = async (db: Database, organizationId: string, userId: string) => {
    const organization = await findOrganization(db, organizationId);

    if (organization.adminId === userId) {
        return organization;
    }

    const membership = await db.query.membersTable.findFirst({
        where: and(
            eq(membersTable.organizationId, organizationId),
            eq(membersTable.userId, userId)
        )
    });

    if (!membership) {
        throw new ApiError(403, "You do not have access to this organization");
    }

    return organization;
};

/** Only the admin may mutate the organization or its member list. */
export const assertAdmin = async (db: Database, organizationId: string, userId: string) => {
    const organization = await findOrganization(db, organizationId);

    if (organization.adminId !== userId) {
        throw new ApiError(403, "Only the organization admin can perform this action");
    }

    return organization;
};
