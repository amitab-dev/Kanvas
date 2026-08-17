"use client"

import { BoardsPanel } from "@/components/dashboard/boards-panel"
import { MembersPanel } from "@/components/dashboard/members-panel"
import { OrganizationSettings } from "@/components/dashboard/organization-settings"
import { useSession } from "@/components/session-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import type { Board, Member, Organization } from "@/lib/types"
import { ArrowLeft, CircleAlert, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { use, useCallback, useEffect, useState } from "react"

export default function OrganizationPage(props: PageProps<"/dashboard/[organizationId]">) {
    const { organizationId } = use(props.params)
    const { user } = useSession()

    const [organization, setOrganization] = useState<Organization | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [boards, setBoards] = useState<Board[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<{ organizationId: string; message: string } | null>(
        null,
    )

    const loadMembers = useCallback(async () => {
        const { data } = await api.get<ApiEnvelope<Member[]>>(
            `/organizations/${organizationId}/members`,
        )
        setMembers(data.data)
    }, [organizationId])

    useEffect(() => {
        let active = true

        const load = async () => {
            try {
                // One round trip each: the org itself, its boards and its members.
                const [organizationResponse, boardsResponse] = await Promise.all([
                    api.get<ApiEnvelope<Organization>>(`/organizations/${organizationId}`),
                    api.get<ApiEnvelope<Board[]>>(`/organizations/${organizationId}/boards`),
                    loadMembers(),
                ])

                if (!active) return
                setOrganization(organizationResponse.data.data)
                setBoards(boardsResponse.data.data)
                setLoadError(null)
            } catch (error) {
                if (!active) return
                setLoadError({
                    organizationId,
                    message: apiErrorMessage(error, "Unable to load this organization"),
                })
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [organizationId, loadMembers])

    const fatalError = loadError?.organizationId === organizationId ? loadError.message : null
    // Data for a previous organization is still on screen while the new one loads.
    const loading = !fatalError && organization?.id !== organizationId

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (fatalError || !organization) {
        return (
            <div className="flex flex-col gap-4">
                <BackLink />
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Can&apos;t open this organization</AlertTitle>
                    <AlertDescription>{fatalError ?? "Organization not found"}</AlertDescription>
                </Alert>
            </div>
        )
    }

    const isAdmin = organization.adminId === user.id

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <BackLink />
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-heading text-2xl font-medium">{organization.name}</h1>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        /{organization.slug}
                    </span>
                    {isAdmin && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ShieldCheck className="size-3.5" /> Admin
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <BoardsPanel
                organizationId={organization.id}
                adminId={organization.adminId}
                boards={boards}
                onChange={setBoards}
                onError={setError}
            />

            <MembersPanel
                organizationId={organization.id}
                adminId={organization.adminId}
                currentUserId={user.id}
                members={members}
                onReload={loadMembers}
                onError={setError}
            />

            <OrganizationSettings
                organization={organization}
                isAdmin={isAdmin}
                onUpdated={setOrganization}
                onError={setError}
            />
        </div>
    )
}

function BackLink() {
    return (
        <Link
            href="/dashboard"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
            <ArrowLeft className="size-4" />
            All organizations
        </Link>
    )
}
