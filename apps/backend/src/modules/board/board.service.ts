import { boardsTable } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";
import { assertMembership } from "../organization/organization.service";

export const findBoard = async (db: Database, boardId: string) => {
    const board = await db.query.boardsTable.findFirst({
        where: eq(boardsTable.id, boardId)
    });

    if (!board) {
        throw new ApiError(404, "Board not found");
    }

    return board;
};

/**
 * Board access is inherited from the organization: anyone in the org can read
 * and edit its boards, which is what makes them a shared workspace.
 */
export const assertBoardAccess = async (db: Database, boardId: string, userId: string) => {
    const board = await findBoard(db, boardId);
    const organization = await assertMembership(db, board.organizationId, userId);

    return { board, organization };
};

/**
 * Deleting a board takes its lists and cards with it, so that stays with the
 * person who created it and the organization admin.
 */
export const assertBoardManage = async (db: Database, boardId: string, userId: string) => {
    const { board, organization } = await assertBoardAccess(db, boardId, userId);

    if (board.createdBy !== userId && organization.adminId !== userId) {
        throw new ApiError(403, "Only the board creator or the organization admin can perform this action");
    }

    return { board, organization };
};
