import { listsTable } from "../../db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { ApiError } from "../../utils/response";
import type { Database } from "../../utils/request";
import { POSITION_STEP, positionBetween, rebalancedPositions } from "../../utils/position";
import { assertBoardAccess } from "../board/board.service";

export const findList = async (db: Database, listId: string) => {
    const list = await db.query.listsTable.findFirst({
        where: eq(listsTable.id, listId)
    });

    if (!list) {
        throw new ApiError(404, "List not found");
    }

    return list;
};

/** A list is readable and editable by anyone who can open its board. */
export const assertListAccess = async (db: Database, listId: string, userId: string) => {
    const list = await findList(db, listId);
    const { board, organization } = await assertBoardAccess(db, list.boardId, userId);

    return { list, board, organization };
};

/** Position for a new list appended to the end of its board. */
export const nextListPosition = async (db: Database, boardId: string) => {
    const [last] = await db
        .select({ position: listsTable.position })
        .from(listsTable)
        .where(eq(listsTable.boardId, boardId))
        .orderBy(desc(listsTable.position))
        .limit(1);

    return positionBetween(last?.position, undefined) ?? POSITION_STEP;
};

/** Renumbers a board's lists to even spacing, preserving their current order. */
export const rebalanceLists = async (db: Database, boardId: string) => {
    const lists = await db
        .select({ id: listsTable.id })
        .from(listsTable)
        .where(eq(listsTable.boardId, boardId))
        .orderBy(asc(listsTable.position));

    const positions = rebalancedPositions(lists.length);

    for (const [index, list] of lists.entries()) {
        await db
            .update(listsTable)
            .set({ position: positions[index]! })
            .where(eq(listsTable.id, list.id));
    }
};

/**
 * Resolves the neighbours named in a move request into a position.
 *
 * Both neighbours must live on the same board as the list being moved,
 * otherwise the drop target is meaningless and the request is a 400.
 */
export const resolveListPosition = async (
    db: Database,
    boardId: string,
    previousId?: string,
    nextId?: string
) => {
    const neighbourPosition = async (id?: string) => {
        if (!id) {
            return undefined;
        }

        const neighbour = await findList(db, id);
        if (neighbour.boardId !== boardId) {
            throw new ApiError(400, "Neighbouring list belongs to a different board");
        }

        return neighbour.position;
    };

    const previous = await neighbourPosition(previousId);
    const next = await neighbourPosition(nextId);

    if (previous !== undefined && next !== undefined && previous >= next) {
        throw new ApiError(400, "Neighbouring lists are not in order");
    }

    const position = positionBetween(previous, next);
    if (position !== null) {
        return position;
    }

    // The gap collapsed, so spread the board out and read the neighbours again.
    await rebalanceLists(db, boardId);

    const rebalanced = positionBetween(
        await neighbourPosition(previousId),
        await neighbourPosition(nextId)
    );

    if (rebalanced === null) {
        throw new ApiError(500, "Failed to position list");
    }

    return rebalanced;
};
