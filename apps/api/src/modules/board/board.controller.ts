import type { FastifyReply, FastifyRequest } from "fastify";
import { boardsTable, usersTable } from "../../db/schema";
import { asc, eq } from "drizzle-orm";
import { ApiError, ApiResponse } from "../../utils/response";
import { currentUserId } from "../../utils/request";
import {
    boardParamsSchema,
    createBoardSchema,
    organizationBoardParamsSchema,
    updateBoardSchema
} from "./board.types";
import { assertBoardAccess, assertBoardManage } from "./board.service";
import { assertMembership } from "../organization/organization.service";

export const createBoard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = organizationBoardParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = createBoardSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    // Any member can open a board; only management is restricted.
    await assertMembership(db, params.organizationId, userId);

    const [createdBoard] = await db
        .insert(boardsTable)
        .values({
            name: data.name,
            organizationId: params.organizationId,
            createdBy: userId
        })
        .returning();

    if (!createdBoard) {
        throw new ApiError(500, "Failed to create board");
    }

    return reply
        .code(201)
        .send(new ApiResponse(201, createdBoard, "Board created successfully"));
};

export const listOrganizationBoards = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = organizationBoardParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertMembership(db, data.organizationId, userId);

    const boards = await db
        .select({
            id: boardsTable.id,
            name: boardsTable.name,
            organizationId: boardsTable.organizationId,
            createdBy: boardsTable.createdBy,
            creatorName: usersTable.fullName,
            createdAt: boardsTable.createdAt,
            updatedAt: boardsTable.updatedAt
        })
        .from(boardsTable)
        .innerJoin(usersTable, eq(usersTable.id, boardsTable.createdBy))
        .where(eq(boardsTable.organizationId, data.organizationId))
        .orderBy(asc(boardsTable.createdAt));

    return reply
        .code(200)
        .send(new ApiResponse(200, boards, "Boards fetched successfully"));
};

export const getBoard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = boardParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertBoardAccess(db, data.id, userId);

    // Lists come back with the board so the client can paint the columns in one
    // round trip; cards are left to the list routes to keep this response small.
    const board = await db.query.boardsTable.findFirst({
        where: eq(boardsTable.id, data.id),
        with: {
            creator: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            },
            lists: true
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, board, "Board fetched successfully"));
};

export const updateBoard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = boardParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = updateBoardSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertBoardManage(db, params.id, userId);

    const [updatedBoard] = await db
        .update(boardsTable)
        .set({ name: data.name })
        .where(eq(boardsTable.id, params.id))
        .returning();

    return reply
        .code(200)
        .send(new ApiResponse(200, updatedBoard, "Board updated successfully"));
};

export const deleteBoard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = boardParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertBoardManage(db, data.id, userId);

    // Lists, cards, attachments and comments cascade away with the board.
    await db.delete(boardsTable).where(eq(boardsTable.id, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Board deleted successfully"));
};
