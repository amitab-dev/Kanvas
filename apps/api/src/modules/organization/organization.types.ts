import z from "zod";

export const slugSchema = z
    .string()
    .min(3, "Slug must be at least 3 character long")
    .max(25, "Slug must be at most 25 character long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")

export const createOrganizationSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(255),
    slug: slugSchema
})

export const updateOrganizationSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(255).optional(),
    slug: slugSchema.optional()
}).refine((data) => data.name !== undefined || data.slug !== undefined, {
    message: "Nothing to update"
})

export const organizationParamsSchema = z.object({
    id: z.uuid()
})

export const memberParamsSchema = z.object({
    id: z.uuid(),
    userId: z.uuid()
})

export const addMemberSchema = z.object({
    email: z.email()
})

export type CreateOrganization = z.infer<typeof createOrganizationSchema>
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>
export type OrganizationParams = z.infer<typeof organizationParamsSchema>
export type MemberParams = z.infer<typeof memberParamsSchema>
export type AddMember = z.infer<typeof addMemberSchema>
