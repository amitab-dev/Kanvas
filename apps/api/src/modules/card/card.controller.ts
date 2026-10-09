import type { FastifyReply, FastifyRequest } from "fastify";
import { cardsTable } from "../../db/schema";
import { and, asc, eq, type SQL } from "drizzle-orm";
import { ApiError, ApiResponse } from "../../utils/response";
import { currentUserId } from "../../utils/request";
import {
    cardParamsSchema,
    createCardSchema,
    listCardParamsSchema,
    listCardsQuerySchema,
    moveCardSchema,
    updateCardSchema
} from "./card.types";
import {
    assertAssignable,
    assertCardAccess,
    nextCardPosition,
    resolveCardPosition
} from "./card.service";
import { assertListAccess } from "../list/list.service";

export const createCard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = listCardParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = createCardSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const { organization } = await assertListAccess(db, params.listId, userId);

    if (data.assignedTo) {
        await assertAssignable(db, organization.id, data.assignedTo);
    }

    const position = await nextCardPosition(db, params.listId);

    const [createdCard] = await db
        .insert(cardsTable)
        .values({
            listId: params.listId,
            title: data.title,
            description: data.description,
            dueDate: data.dueDate ?? null,
            assignedTo: data.assignedTo ?? null,
            status: data.status,
            priority: data.priority,
            position,
            createdBy: userId
        })
        .returning();

    if (!createdCard) {
        throw new ApiError(500, "Failed to create card");
    }

    return reply
        .code(201)
        .send(new ApiResponse(201, createdCard, "Card created successfully"));
};

export const listCards = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = listCardParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data: query, error } = listCardsQuerySchema.safeParse(req.query);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertListAccess(db, params.listId, userId);

    const filters: SQL[] = [eq(cardsTable.listId, params.listId)];

    // Archived cards stay out of the column unless they are asked for.
    if (!query.includeArchived) {
        filters.push(eq(cardsTable.isArchived, false));
    }
    if (query.status) {
        filters.push(eq(cardsTable.status, query.status));
    }
    if (query.priority) {
        filters.push(eq(cardsTable.priority, query.priority));
    }
    if (query.assignedTo) {
        filters.push(eq(cardsTable.assignedTo, query.assignedTo));
    }

    const cards = await db.query.cardsTable.findMany({
        where: and(...filters),
        orderBy: asc(cardsTable.position),
        with: {
            assignee: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            }
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, cards, "Cards fetched successfully"));
};

export const getCard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = cardParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCardAccess(db, data.id, userId);

    // The detail view is one round trip: everything the card modal shows.
    const card = await db.query.cardsTable.findFirst({
        where: eq(cardsTable.id, data.id),
        with: {
            creator: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            },
            assignee: {
                columns: { id: true, fullName: true, email: true, avatar: true }
            },
            comments: {
                with: {
                    user: {
                        columns: { id: true, fullName: true, email: true, avatar: true }
                    }
                }
            },
            attachments: true
        }
    });

    return reply
        .code(200)
        .send(new ApiResponse(200, card, "Card fetched successfully"));
};

export const updateCard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = cardParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = updateCardSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const { organization } = await assertCardAccess(db, params.id, userId);

    if (data.assignedTo) {
        await assertAssignable(db, organization.id, data.assignedTo);
    }

    // Only the keys the client actually sent are written, so an omitted field
    // keeps its value while an explicit null clears it.
    const changes = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? null }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived })
    };

    const [updatedCard] = await db
        .update(cardsTable)
        .set(changes)
        .where(eq(cardsTable.id, params.id))
        .returning();

    return reply
        .code(200)
        .send(new ApiResponse(200, updatedCard, "Card updated successfully"));
};

/** Reorders a card within its list, or moves it into another list of the same board. */
export const moveCard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data: params, error: paramsError } = cardParamsSchema.safeParse(req.params);
    if (paramsError) {
        throw new ApiError(422, "Validation error");
    }

    const { data, error } = moveCardSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const { card, board } = await assertCardAccess(db, params.id, userId);

    if (data.previousId === params.id || data.nextId === params.id) {
        throw new ApiError(400, "A card cannot be moved relative to itself");
    }

    const targetListId = data.listId ?? card.listId;

    if (targetListId !== card.listId) {
        const { list: targetList } = await assertListAccess(db, targetListId, userId);

        // Both lists are already known to be readable, but a card must not jump
        // between boards: its neighbours and its board would disagree.
        if (targetList.boardId !== board.id) {
            throw new ApiError(400, "Cannot move a card to a list on another board");
        }
    }

    const position = await resolveCardPosition(
        db,
        targetListId,
        data.previousId,
        data.nextId
    );

    const [movedCard] = await db
        .update(cardsTable)
        .set({ listId: targetListId, position })
        .where(eq(cardsTable.id, params.id))
        .returning();

    return reply
        .code(200)
        .send(new ApiResponse(200, movedCard, "Card moved successfully"));
};

export const deleteCard = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;
    const userId = currentUserId(req);

    const { data, error } = cardParamsSchema.safeParse(req.params);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    await assertCardAccess(db, data.id, userId);

    // The card's comments and attachments cascade away with it.
    await db.delete(cardsTable).where(eq(cardsTable.id, data.id));

    return reply
        .code(200)
        .send(new ApiResponse(200, null, "Card deleted successfully"));
};
