import z from "zod";

/**
 * Attachments are registered, not uploaded: the client puts the file in
 * storage and posts the resulting URL here. Nothing in this app accepts
 * multipart bodies yet.
 */
export const createAttachmentSchema = z.object({
    fileUrl: z.url("A valid file URL is required"),
    fileName: z.string().min(1, "File name is required").max(100)
})

export const attachmentParamsSchema = z.object({
    id: z.uuid()
})

export const cardAttachmentParamsSchema = z.object({
    cardId: z.uuid()
})

export type CreateAttachment = z.infer<typeof createAttachmentSchema>
export type AttachmentParams = z.infer<typeof attachmentParamsSchema>
export type CardAttachmentParams = z.infer<typeof cardAttachmentParamsSchema>
