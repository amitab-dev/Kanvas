import { commentsTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";
import { assertCardAccess } from "../card/card.service";

export const findComment = async (db: Database, commentId: string) => {
    const comment = await db.query.commentsTable.findFirst({
        where: eq(commentsTable.id, commentId)
    });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    return comment;
};

/**
 * Reading a comment follows the card it hangs off, but removing one stays with
 * its author and the organization admin, who moderates the workspace.
 */
export const assertCommentDelete = async (db: Database, commentId: string, userId: string) => {
    const comment = await findComment(db, commentId);
    const { card, organization } = await assertCardAccess(db, comment.cardId, userId);

    if (comment.userId !== userId && organization.adminId !== userId) {
        throw new ApiError(403, "Only the comment author or the organization admin can perform this action");
    }

    return { comment, card, organization };
};
