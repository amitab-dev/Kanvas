"use client"

import { CreateOrganizationForm } from "@/components/dashboard/create-organization-form"
import { useSession } from "@/components/session-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import type { Organization } from "@/lib/types"
import { Building2, CircleAlert, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function OrganizationsPage() {
    const { user } = useSession()
    const [organizations, setOrganizations] = useState<Organization[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        const load = async () => {
            try {
                const { data } = await api.get<ApiEnvelope<Organization[]>>("/organizations")
                if (!active) return
                setOrganizations(data.data)
                setError(null)
            } catch (loadError) {
                if (!active) return
                setError(apiErrorMessage(loadError, "Unable to load your organizations"))
                setOrganizations([])
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-medium">Organizations</h1>
                    <p className="text-sm text-muted-foreground">
                        Workspaces you own or belong to {user.fullName.split(" ")[0]}.
                    </p>
                </div>
                <CreateOrganizationForm
                    onCreated={(organization) =>
                        setOrganizations((current) => [...(current ?? []), organization])
                    }
                />
            </div>

            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {organizations === null ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((key) => (
                        <Skeleton key={key} className="h-32 w-full" />
                    ))}
                </div>
            ) : organizations.length === 0 ? (
                <Card className="items-center py-12 text-center">
                    <CardContent className="items-center gap-2">
                        <Building2 className="size-8 text-muted-foreground" />
                        <p className="font-medium">No organizations yet</p>
                        <p className="text-sm text-muted-foreground">
                            Create one to start building boards with your team.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {organizations.map((organization) => (
                        <Link
                            key={organization.id}
                            href={`/dashboard/${organization.id}`}
                            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                            <Card className="h-full transition-shadow hover:shadow-md">
                                <CardHeader>
                                    <CardTitle>{organization.name}</CardTitle>
                                    <CardDescription>/{organization.slug}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        {organization.adminId === user.id ? (
                                            <>
                                                <ShieldCheck className="size-3.5" /> You are the admin
                                            </>
                                        ) : (
                                            <>
                                                <Building2 className="size-3.5" /> Member
                                            </>
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
