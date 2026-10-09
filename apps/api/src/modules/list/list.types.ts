import z from "zod";

export const createListSchema = z.object({
    name: z.string().min(1, "List name is required").max(255)
})

export const updateListSchema = z.object({
    name: z.string().min(1, "List name is required").max(255)
})

/**
 * A move is expressed as the neighbours the list was dropped between, not as a
 * raw position: the client knows what it dragged past, and the server owns the
 * arithmetic. Omitting `previousId` drops it first, omitting `nextId` last.
 */
export const moveListSchema = z.object({
    previousId: z.uuid().optional(),
    nextId: z.uuid().optional()
})

export const listParamsSchema = z.object({
    id: z.uuid()
})

export const boardListParamsSchema = z.object({
    boardId: z.uuid()
})

export type CreateList = z.infer<typeof createListSchema>
export type UpdateList = z.infer<typeof updateListSchema>
export type MoveList = z.infer<typeof moveListSchema>
export type ListParams = z.infer<typeof listParamsSchema>
export type BoardListParams = z.infer<typeof boardListParamsSchema>
