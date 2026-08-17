"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api, apiErrorMessage, apiErrorStatus, expiredSessionUrl } from "@/lib/api"
import type { ApiEnvelope } from "@/lib/api"
import type { User } from "@/lib/types"
import { CircleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

type SessionValue = {
    user: User
    signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function useSession() {
    const session = useContext(SessionContext)
    if (!session) {
        throw new Error("useSession must be used within a SessionProvider")
    }
    return session
}

export function SessionProvider({
    children,
    fallback,
}: {
    children: React.ReactNode
    fallback?: React.ReactNode
}) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let active = true

        const load = async () => {
            try {
                const { data } = await api.get<ApiEnvelope<User>>("/users/me")
                if (!active) return
                setUser(data.data)
                setError(null)
            } catch (loadError) {
                if (!active) return

                if (apiErrorStatus(loadError) === 401) {
                    router.replace(expiredSessionUrl())
                    return
                }

                setError(apiErrorMessage(loadError, "Unable to reach the server"))
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [router, attempt])

    if (error) {
        return (
            <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 p-4">
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Can&apos;t load your session</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div>
                    <Button
                        onClick={() => {
                            setError(null)
                            setAttempt((current) => current + 1)
                        }}
                    >
                        Try again
                    </Button>
                </div>
            </div>
        )
    }

    if (!user) {
        return <>{fallback}</>
    }

    const signOut = async () => {
        try {
            await api.post("/auth/logout")
        } finally {
            router.replace("/auth/login")
            router.refresh()
        }
    }

    return (
        <SessionContext.Provider value={{ user, signOut }}>{children}</SessionContext.Provider>
    )
}
