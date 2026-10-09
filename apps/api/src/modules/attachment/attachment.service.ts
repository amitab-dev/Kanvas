import { attachmentsTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";
import { assertCardAccess } from "../card/card.service";

export const findAttachment = async (db: Database, attachmentId: string) => {
    const attachment = await db.query.attachmentsTable.findFirst({
        where: eq(attachmentsTable.id, attachmentId)
    });

    if (!attachment) {
        throw new ApiError(404, "Attachment not found");
    }

    return attachment;
};

/** Removing an attachment stays with whoever added it, and the organization admin. */
export const assertAttachmentDelete = async (
    db: Database,
    attachmentId: string,
    userId: string
) => {
    const attachment = await findAttachment(db, attachmentId);
    const { card, organization } = await assertCardAccess(db, attachment.cardId, userId);

    if (attachment.uploadedBy !== userId && organization.adminId !== userId) {
        throw new ApiError(403, "Only the uploader or the organization admin can perform this action");
    }

    return { attachment, card, organization };
};
