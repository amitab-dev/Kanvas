import { CARD_PRIORITIES, CARD_STATUSES } from "@/lib/types"
import z from "zod"

export const listSchema = z.object({
    name: z.string().trim().min(1, "List name is required").max(255),
})

export const cardTitleSchema = z.object({
    title: z.string().trim().min(1, "Card title is required").max(100),
})

/**
 * The card page's field form. `dueDate` is the raw value of an `<input
 * type="date">` and `assignedTo` uses "" for unassigned, since a select cannot
 * hold null; both are normalised before they reach the API.
 */
export const cardDetailsSchema = z.object({
    title: z.string().trim().min(1, "Card title is required").max(100),
    description: z.string().max(250, "Description must be at most 250 characters"),
    status: z.enum(CARD_STATUSES),
    priority: z.enum(CARD_PRIORITIES),
    dueDate: z.string(),
    assignedTo: z.string(),
})

export const commentSchema = z.object({
    comment: z.string().trim().min(1, "Write something first").max(2000),
})

export const attachmentSchema = z.object({
    fileName: z.string().trim().min(1, "File name is required").max(100),
    fileUrl: z.url("Enter a valid file URL"),
})

export type ListInput = z.infer<typeof listSchema>
export type CardTitleInput = z.infer<typeof cardTitleSchema>
export type CardDetailsInput = z.infer<typeof cardDetailsSchema>
export type CommentInput = z.infer<typeof commentSchema>
export type AttachmentInput = z.infer<typeof attachmentSchema>
