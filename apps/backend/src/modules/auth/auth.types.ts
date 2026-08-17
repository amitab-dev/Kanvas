import z from "zod";

/**
 * Request body schemas for the auth routes. These are attached to the routes
 * as Fastify schemas *and* re-parsed inside the controllers, so a controller
 * called from anywhere else still validates its own input.
 */

export const registerSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.email(),
    password: z.string().min(6, "Password must be 6 character long")
})

// Login only checks that a password was supplied; the length rule belongs to
// registration, so tightening it later cannot lock out existing accounts.
export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1, "Password is required")
})

export type Register = z.infer<typeof registerSchema>
export type Login = z.infer<typeof loginSchema>