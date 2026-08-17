'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiErrorMessage } from "@/lib/api";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function LoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    })

    const onSubmit = async (values: LoginInput) => {
        try {
            await api.post("/auth/login", values)

            const next = new URLSearchParams(window.location.search).get("next")
            const destination =
                next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"

            router.push(destination)
        } catch (error) {
            setError("root", { message: apiErrorMessage(error, "Unable to log in") })
            return
        } finally {
            router.refresh()
        }
    }

    return (
        <>
            <div className="w-full min-h-screen flex justify-center items-center p-4" >
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="w-full max-w-lg border border-zinc-600/10 rounded-lg p-5 py-10 flex justify-start items-center flex-col space-y-4"
                >
                    <div className="w-full flex justify-center items-center flex-col">
                        <h1 className="text-xl font-medium">Welcome back</h1>
                        <p className="text-zinc-500 text-sm">Enter your credentials to get started</p>
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
                                autoComplete="current-password"
                                placeholder="Enter your password"
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

                    {errors.root && (
                        <p role="alert" className="w-full px-10 text-red-600 text-sm">
                            {errors.root.message}
                        </p>
                    )}

                    <div className="w-full px-10">
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting && <LoaderCircle className="animate-spin" />}
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </Button>
                    </div>

                    <p className="text-zinc-500 text-sm">
                        Don&apos;t have an account?{" "}
                        <Link href="/auth/register" className="text-foreground underline underline-offset-4">
                            Create one
                        </Link>
                    </p>
                </form>
            </div>
        </>
    )
}
