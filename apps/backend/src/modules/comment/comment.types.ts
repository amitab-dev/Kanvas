import z from "zod";

export const createCommentSchema = z.object({
    comment: z.string().min(1, "Comment is required").max(2000)
})

export const commentParamsSchema = z.object({
    id: z.uuid()
})

export const cardCommentParamsSchema = z.object({
    cardId: z.uuid()
})

export type CreateComment = z.infer<typeof createCommentSchema>
export type CommentParams = z.infer<typeof commentParamsSchema>
export type CardCommentParams = z.infer<typeof cardCommentParamsSchema>
