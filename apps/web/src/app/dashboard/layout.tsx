"use client"

import { SessionProvider } from "@/components/session-provider"
import { TopBar } from "@/components/dashboard/top-bar"
import { LoaderCircle } from "lucide-react"

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
    return (
        <SessionProvider
            fallback={
                <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                    <LoaderCircle className="size-5 animate-spin" />
                </div>
            }
        >
            <div className="flex min-h-screen flex-col">
                <TopBar />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
            </div>
        </SessionProvider>
    )
}
