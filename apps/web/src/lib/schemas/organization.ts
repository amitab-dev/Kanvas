import z from "zod"

// Mirrors the backend's `slugSchema` so a bad slug is caught before the round trip.
export const slugSchema = z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters long")
    .max(25, "Slug must be at most 25 characters long")
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug may only contain lowercase letters, numbers and hyphens",
    )

export const createOrganizationSchema = z.object({
    name: z.string().trim().min(1, "Organization name is required").max(255),
    slug: slugSchema,
})

export const updateOrganizationSchema = z.object({
    name: z.string().trim().min(1, "Organization name is required").max(255),
    slug: slugSchema,
})

export const addMemberSchema = z.object({
    email: z.email("Enter a valid email address"),
})

export const boardSchema = z.object({
    name: z.string().trim().min(1, "Board name is required").max(200),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type BoardInput = z.infer<typeof boardSchema>

/** Turns "Acme Corp!" into "acme-corp" so the slug field can follow the name. */
export const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 25)
        .replace(/-+$/g, "")
