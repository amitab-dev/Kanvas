import z from "zod"

export const registerSchema = z.object({
    fullName: z.string().trim().min(1, "Full name is required"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
}).refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export const loginSchema = z.object({
    email: z.email("Enter a valid email address"),
    password: z.string().min(6, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
