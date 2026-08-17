import type { FastifyReply, FastifyRequest } from "fastify";
import { commentsTable } from "@repo/db/schema";
import { asc, eq } from "drizzle-orm";
import { ApiError, ApiResponse } from "../../utils/response";
import { currentUserId } from "../../utils/request";
import {
    cardCommentParamsSchema,
    commentParamsSchema,
    createCommentSchema
} from "./comment.types";
import { assertCommentDelete } from "./comment.service";
import { assertCardAccess } from "../card/card.service";

export const createComment = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = cardCommentParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = createCommentSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCardAccess(db, params.cardId, userId);

    const [createdComment] = await db
        .insert(commentsTable)
        .values({
            cardId: params.cardId,
            userId,
            comment: data.comment
        })
        .returning();

    if (!createdComment) {
        throw new ApiError(500, "Failed to create comment");
    }

    return reply
        .code(201)
        .send(new ApiResponse(201, createdComment, "Comment added successfully"));
};

export const listCardComments = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = cardCommentParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCardAccess(db, data.cardId, userId);

    // Oldest first, so the thread reads top to bottom.
    const comments = await db.query.commentsTable.findMany({
        where: eq(commentsTable.cardId, data.cardId),
        orderBy: asc(commentsTable.createdAt),
        with: {
            user: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            }
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, comments, "Comments fetched successfully"));
};

export const deleteComment = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = commentParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCommentDelete(db, data.id, userId);

    await db.delete(commentsTable).where(eq(commentsTable.id, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Comment deleted successfully"));
};
