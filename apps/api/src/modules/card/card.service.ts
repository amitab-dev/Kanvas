import { cardsTable, membersTable, organizationTable } from "../../db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";
import { POSITION_STEP, positionBetween, rebalancedPositions } from "../../utils/position";
import { assertListAccess } from "../list/list.service";

export const findCard = async (db: Database, cardId: string) => {
    const card = await db.query.cardsTable.findFirst({
        where: eq(cardsTable.id, cardId)
    });

    if (!card) {
        throw new ApiError(404, "Card not found");
    }

    return card;
};

/** A card is readable and editable by anyone who can open its board. */
export const assertCardAccess = async (db: Database, cardId: string, userId: string) => {
    const card = await findCard(db, cardId);
    const { list, board, organization } = await assertListAccess(db, card.listId, userId);

    return { card, list, board, organization };
};

/**
 * A card can only be assigned to someone who is in the board's organization,
 * otherwise the assignee would not be able to open the card they now own.
 */
export const assertAssignable = async (
    db: Database,
    organizationId: string,
    assigneeId: string
) => {
    const organization = await db.query.organizationTable.findFirst({
        where: eq(organizationTable.id, organizationId)
    });

    if (organization?.adminId === assigneeId) {
        return;
    }

    const membership = await db.query.membersTable.findFirst({
        where: and(
            eq(membersTable.organizationId, organizationId),
            eq(membersTable.userId, assigneeId)
        )
    });

    if (!membership) {
        throw new ApiError(400, "Assignee is not a member of this organization");
    }
};

/** Position for a new card appended to the bottom of its list. */
export const nextCardPosition = async (db: Database, listId: string) => {
    const [last] = await db
        .select({ position: cardsTable.position })
        .from(cardsTable)
        .where(eq(cardsTable.listId, listId))
        .orderBy(desc(cardsTable.position))
        .limit(1);

    return positionBetween(last?.position, undefined) ?? POSITION_STEP;
};

/** Renumbers a list's cards to even spacing, preserving their current order. */
export const rebalanceCards = async (db: Database, listId: string) => {
    const cards = await db
        .select({ id: cardsTable.id })
        .from(cardsTable)
        .where(eq(cardsTable.listId, listId))
        .orderBy(asc(cardsTable.position));

    const positions = rebalancedPositions(cards.length);

    for (const [index, card] of cards.entries()) {
        await db
            .update(cardsTable)
            .set({ position: positions[index]! })
            .where(eq(cardsTable.id, card.id));
    }
};

/**
 * Resolves the neighbours named in a move request into a position within
 * `listId`. Both neighbours must already be in that list, so a client cannot
 * drop a card between two cards that are not next to each other.
 */
export const resolveCardPosition = async (
    db: Database,
    listId: string,
    previousId?: string,
    nextId?: string
) => {
    const neighbourPosition = async (id?: string) => {
        if (!id) {
            return undefined;
        }

        const neighbour = await findCard(db, id);
        if (neighbour.listId !== listId) {
            throw new ApiError(400, "Neighbouring card belongs to a different list");
        }

        return neighbour.position;
    };

    const previous = await neighbourPosition(previousId);
    const next = await neighbourPosition(nextId);

    if (previous !== undefined && next !== undefined && previous >= next) {
        throw new ApiError(400, "Neighbouring cards are not in order");
    }

    const position = positionBetween(previous, next);
    if (position !== null) {
        return position;
    }

    // The gap collapsed, so spread the list out and read the neighbours again.
    await rebalanceCards(db, listId);

    const rebalanced = positionBetween(
        await neighbourPosition(previousId),
        await neighbourPosition(nextId)
    );

    if (rebalanced === null) {
        throw new ApiError(500, "Failed to position card");
    }

    return rebalanced;
};
