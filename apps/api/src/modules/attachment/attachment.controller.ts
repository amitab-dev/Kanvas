import type { FastifyReply, FastifyRequest } from "fastify";
import { attachmentsTable } from "../../db/schema";
import { asc, eq } from "drizzle-orm";
import { ApiError, ApiResponse } from "../../utils/response";
import { currentUserId } from "../../utils/request";
import {
    attachmentParamsSchema,
    cardAttachmentParamsSchema,
    createAttachmentSchema
} from "./attachment.types";
import { assertAttachmentDelete } from "./attachment.service";
import { assertCardAccess } from "../card/card.service";

export const createAttachment = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = cardAttachmentParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = createAttachmentSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCardAccess(db, params.cardId, userId);

    const [createdAttachment] = await db
        .insert(attachmentsTable)
        .values({
            cardId: params.cardId,
            uploadedBy: userId,
            fileUrl: data.fileUrl,
            fileName: data.fileName
        })
        .returning();

    if (!createdAttachment) {
        throw new ApiError(500, "Failed to add attachment");
    }

    return reply
        .code(201)
        .send(new ApiResponse(201, createdAttachment, "Attachment added successfully"));
};

export const listCardAttachments = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = cardAttachmentParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCardAccess(db, data.cardId, userId);

    const attachments = await db.query.attachmentsTable.findMany({
        where: eq(attachmentsTable.cardId, data.cardId),
        orderBy: asc(attachmentsTable.createdAt),
        with: {
            uploader: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            }
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, attachments, "Attachments fetched successfully"));
};

export const deleteAttachment = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = attachmentParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertAttachmentDelete(db, data.id, userId);

    // Only the row goes: the file itself lives in storage this app does not own.
    await db.delete(attachmentsTable).where(eq(attachmentsTable.id, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Attachment deleted successfully"));
};
