/**
 * Ordering helpers for lists and cards.
 *
 * Positions are sparse fractional ranks rather than 0..n indexes: an item
 * dropped between two others takes the midpoint of its neighbours, so a move
 * writes one row instead of renumbering every sibling.
 */

/** Spacing between appended items, and the step used when renumbering. */
export const POSITION_STEP = 1024;

/**
 * Repeated midpoints halve the gap each time, so a column reordered into the
 * same spot often enough eventually runs out of representable doubles. Below
 * this the caller renumbers the container instead.
 */
const MIN_GAP = 1e-6;

/**
 * The position for an item dropped between `previous` and `next`, either of
 * which is undefined at the ends of the container.
 *
 * Returns null when the neighbours have grown too close to fit anything
 * between them; the caller should rebalance and ask again.
 */
export const positionBetween = (previous?: number, next?: number): number | null => {
    if (previous === undefined && next === undefined) {
        return POSITION_STEP;
    }

    if (previous === undefined) {
        return next! / 2;
    }

    if (next === undefined) {
        return previous + POSITION_STEP;
    }

    if (next - previous < MIN_GAP) {
        return null;
    }

    return previous + (next - previous) / 2;
};

/** Evenly spaced positions for `count` items, in their current order. */
export const rebalancedPositions = (count: number) =>
    Array.from({ length: count }, (_, index) => (index + 1) * POSITION_STEP);
