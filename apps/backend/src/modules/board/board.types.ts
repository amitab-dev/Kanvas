import z from "zod";

export const createBoardSchema = z.object({
    name: z.string().min(1, "Board name is required").max(200)
})

export const updateBoardSchema = z.object({
    name: z.string().min(1, "Board name is required").max(200)
})

export const boardParamsSchema = z.object({
    id: z.uuid()
})

export const organizationBoardParamsSchema = z.object({
    organizationId: z.uuid()
})

export type CreateBoard = z.infer<typeof createBoardSchema>
export type UpdateBoard = z.infer<typeof updateBoardSchema>
export type BoardParams = z.infer<typeof boardParamsSchema>
export type OrganizationBoardParams = z.infer<typeof organizationBoardParamsSchema>
