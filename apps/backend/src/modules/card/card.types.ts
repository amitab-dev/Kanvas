import z from "zod";

const cardStatusSchema = z.enum(["UPCOMING", "IN PROGRESS", "IN REVIEW", "DONE"])
const cardPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"])

/**
 * Only a title is required: a card starts as something typed into a column and
 * is filled in afterwards. `dueDate` and `assignedTo` accept null so a client
 * can clear them with the same payload it uses to set them.
 */
export const createCardSchema = z.object({
    title: z.string().min(1, "Card title is required").max(100),
    description: z.string().max(250).optional(),
    dueDate: z.coerce.date().nullish(),
    assignedTo: z.uuid().nullish(),
    status: cardStatusSchema.optional(),
    priority: cardPrioritySchema.optional()
})

export const updateCardSchema = z.object({
    title: z.string().min(1, "Card title is required").max(100).optional(),
    description: z.string().max(250).optional(),
    dueDate: z.coerce.date().nullish(),
    assignedTo: z.uuid().nullish(),
    status: cardStatusSchema.optional(),
    priority: cardPrioritySchema.optional(),
    isArchived: z.boolean().optional()
}).refine(
    (body) => Object.keys(body).length > 0,
    { message: "No fields to update" }
)

/**
 * A move carries the destination list and the neighbours the card was dropped
 * between. `listId` is optional because reordering within a column is the same
 * operation as moving across one.
 */
export const moveCardSchema = z.object({
    listId: z.uuid().optional(),
    previousId: z.uuid().optional(),
    nextId: z.uuid().optional()
})

/** Filters for the cards of one list; all optional and combined with AND. */
export const listCardsQuerySchema = z.object({
    status: cardStatusSchema.optional(),
    priority: cardPrioritySchema.optional(),
    assignedTo: z.uuid().optional(),
    includeArchived: z.coerce.boolean().optional()
})

export const cardParamsSchema = z.object({
    id: z.uuid()
})

export const listCardParamsSchema = z.object({
    listId: z.uuid()
})

export type CreateCard = z.infer<typeof createCardSchema>
export type UpdateCard = z.infer<typeof updateCardSchema>
export type MoveCard = z.infer<typeof moveCardSchema>
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>
export type CardParams = z.infer<typeof cardParamsSchema>
export type ListCardParams = z.infer<typeof listCardParamsSchema>
