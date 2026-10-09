import z from "zod";

export const updateProfileSchema = z.object({
    fullName: z.string().min(1, "Full name is required").max(255).optional(),
    avatar: z.union([z.url(), z.literal("")]).optional()
}).refine((data) => data.fullName !== undefined || data.avatar !== undefined, {
    message: "Nothing to update"
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be 6 character long")
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password"
})

export const deleteAccountSchema = z.object({
    password: z.string().min(1, "Password is required")
})

export const userParamsSchema = z.object({
    id: z.uuid()
})

export const searchUsersSchema = z.object({
    q: z.string().min(3, "Search query must be at least 3 character long").max(255),
    limit: z.coerce.number().int().min(1).max(50).default(10)
})

export type UpdateProfile = z.infer<typeof updateProfileSchema>
export type ChangePassword = z.infer<typeof changePasswordSchema>
export type DeleteAccount = z.infer<typeof deleteAccountSchema>
export type UserParams = z.infer<typeof userParamsSchema>
export type SearchUsers = z.infer<typeof searchUsersSchema>
