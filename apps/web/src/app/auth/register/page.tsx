'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiErrorMessage, apiErrorStatus } from "@/lib/api";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
    })

    const onSubmit = async (values: RegisterInput) => {
        const credentials = {
            fullName: values.fullName,
            email: values.email,
            password: values.password,
        }

        try {
            await api.post("/auth/register", credentials)
            router.replace("/auth/login")
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setError("email", { message: apiErrorMessage(error, "Email already taken") })
                return
            }
            setError("root", { message: apiErrorMessage(error, "Unable to create your account") })
            return
        } finally {

        }
    }

    return (
        <>
            {errors.root && (
                <p role="alert" className="w-full px-10 text-red-600 text-sm">
                    {errors.root.message}
                </p>
            )}
            <div className="w-full min-h-screen flex justify-center items-center p-4" >
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="w-full max-w-lg border border-zinc-600/10 rounded-lg p-5 py-10 flex justify-start items-center flex-col space-y-4"
                >
                    <div className="w-full flex justify-center items-center flex-col">
                        <h1 className="text-xl font-medium">Create your account</h1>
                        <p className="text-zinc-500 text-sm">Just a few details to get you started</p>
                    </div>

                    <div className="w-full px-10 space-y-1" >
                        <div className="flex justify-start items-center space-x-0.5" >
                            <Label htmlFor="fullName">Full name</Label><p className="text-red-600">*</p>
                        </div>
                        <Input
                            id="fullName"
                            type="text"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            aria-invalid={!!errors.fullName}
                            {...register("fullName")}
                        />
                        {errors.fullName && (
                            <p className="text-red-600 text-xs">{errors.fullName.message}</p>
                        )}
                    </div>

                    <div className="w-full px-10 space-y-1" >
                        <div className="flex justify-start items-center space-x-0.5" >
                            <Label htmlFor="email">Email</Label><p className="text-red-600">*</p>
                        </div>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="Enter your email"
                            aria-invalid={!!errors.email}
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-red-600 text-xs">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="w-full px-10 space-y-1" >
                        <div className="flex justify-start items-center space-x-0.5" >
                            <Label htmlFor="password">Password</Label><p className="text-red-600">*</p>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="At least 6 characters"
                                aria-invalid={!!errors.password}
                                className="pr-9"
                                {...register("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute inset-y-0 right-0 px-2.5 flex items-center text-zinc-500 hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-600 text-xs">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="w-full px-10 space-y-1" >
                        <div className="flex justify-start items-center space-x-0.5" >
                            <Label htmlFor="confirmPassword">Confirm password</Label><p className="text-red-600">*</p>
                        </div>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="Re-enter your password"
                                aria-invalid={!!errors.confirmPassword}
                                className="pr-9"
                                {...register("confirmPassword")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((visible) => !visible)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                className="absolute inset-y-0 right-0 px-2.5 flex items-center text-zinc-500 hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-600 text-xs">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <div className="w-full px-10">
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting && <LoaderCircle className="animate-spin" />}
                            {isSubmitting ? "Creating account..." : "Create account"}
                        </Button>
                    </div>

                    <p className="text-zinc-500 text-sm">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="text-foreground underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </>
    )
}
