import type { FastifyReply, FastifyRequest } from "fastify";
import { cardsTable, listsTable } from "@repo/db/schema";
import { asc, eq } from "drizzle-orm";
import { ApiError, ApiResponse } from "../../utils/response";
import { currentUserId } from "../../utils/request";
import {
    boardListParamsSchema,
    createListSchema,
    listParamsSchema,
    moveListSchema,
    updateListSchema
} from "./list.types";
import {
    assertListAccess,
    nextListPosition,
    resolveListPosition
} from "./list.service";
import { assertBoardAccess } from "../board/board.service";

export const createList = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = boardListParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = createListSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertBoardAccess(db, params.boardId, userId);

    // New columns land at the right-hand end of the board.
    const position = await nextListPosition(db, params.boardId);

    const [createdList] = await db
        .insert(listsTable)
        .values({
            boardId: params.boardId,
            name: data.name,
            position
        })
        .returning();

    if (!createdList) {
        throw new ApiError(500, "Failed to create list");
    }

    return reply
        .code(201)
        .send(new ApiResponse(201, createdList, "List created successfully"));
};

export const listBoardLists = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = boardListParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertBoardAccess(db, data.boardId, userId);

    const lists = await db.query.listsTable.findMany({
        where: eq(listsTable.boardId, data.boardId),
        orderBy: asc(listsTable.position)
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, lists, "Lists fetched successfully"));
};

export const getList = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = listParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertListAccess(db, data.id, userId);

    // Archived cards are left out: this is the column as the board renders it.
    const list = await db.query.listsTable.findFirst({
        where: eq(listsTable.id, data.id),
        with: {
            cards: {
                where: eq(cardsTable.isArchived, false),
                orderBy: asc(cardsTable.position)
            }
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, list, "List fetched successfully"));
};

export const updateList = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = listParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = updateListSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertListAccess(db, params.id, userId);

    const [updatedList] = await db
        .update(listsTable)
        .set({ name: data.name })
        .where(eq(listsTable.id, params.id))
        .returning();

    return reply
        .code(200)
        .send(new ApiResponse(200, updatedList, "List updated successfully"));
};

export const moveList = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = listParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = moveListSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const { list } = await assertListAccess(db, params.id, userId);

    if (data.previousId === params.id || data.nextId === params.id) {
        throw new ApiError(400, "A list cannot be moved relative to itself");
    }

    const position = await resolveListPosition(
        db,
        list.boardId,
        data.previousId,
        data.nextId
    );

    const [movedList] = await db
        .update(listsTable)
        .set({ position })
        .where(eq(listsTable.id, params.id))
        .returning();

    return reply
        .code(200)
        .send(new ApiResponse(200, movedList, "List moved successfully"));
};

export const deleteList = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = listParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertListAccess(db, data.id, userId);

    // The list's cards, and their comments and attachments, cascade away.
    await db.delete(listsTable).where(eq(listsTable.id, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "List deleted successfully"));
};
