"use client"

import { AttachmentsSection } from "@/components/board/attachments-section"
import { CardDetailsForm } from "@/components/board/card-details-form"
import { CommentsSection } from "@/components/board/comments-section"
import { ConfirmAction } from "@/components/dashboard/confirm-action"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "@/components/session-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import type { CardDetail, Member, Organization } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ArchiveRestore, ArchiveX, ArrowLeft, CircleAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"

export default function CardPage(
    props: PageProps<"/dashboard/[organizationId]/boards/[boardId]/cards/[cardId]">,
) {
    const { organizationId, boardId, cardId } = use(props.params)
    const router = useRouter()
    const { user } = useSession()

    const [card, setCard] = useState<CardDetail | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [adminId, setAdminId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<{ cardId: string; message: string } | null>(null)
    const [archiving, setArchiving] = useState(false)

    const boardHref = `/dashboard/${organizationId}/boards/${boardId}`

    useEffect(() => {
        let active = true

        const load = async () => {
            try {
                // Members come along for the assignee picker, and the
                // organization for its admin, who may moderate every comment
                // and attachment on the card.
                const [cardResponse, membersResponse, organizationResponse] = await Promise.all([
                    api.get<ApiEnvelope<CardDetail>>(`/cards/${cardId}`),
                    api.get<ApiEnvelope<Member[]>>(`/organizations/${organizationId}/members`),
                    api.get<ApiEnvelope<Organization>>(`/organizations/${organizationId}`),
                ])

                if (!active) return
                setCard(cardResponse.data.data)
                setMembers(membersResponse.data.data)
                setAdminId(organizationResponse.data.data.adminId)
                setLoadError(null)
            } catch (loadFailure) {
                if (!active) return
                setLoadError({
                    cardId,
                    message: apiErrorMessage(loadFailure, "Unable to load this card"),
                })
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [cardId, organizationId])

    const toggleArchived = async () => {
        if (!card) return

        setArchiving(true)
        try {
            await api.patch(`/cards/${card.id}`, { isArchived: !card.isArchived })
            setCard({ ...card, isArchived: !card.isArchived })
            setError(null)
        } catch (archiveError) {
            setError(apiErrorMessage(archiveError, "Unable to archive the card"))
        } finally {
            setArchiving(false)
        }
    }

    const deleteCard = async () => {
        try {
            await api.delete(`/cards/${cardId}`)
        } catch (deleteError) {
            setError(apiErrorMessage(deleteError, "Unable to delete the card"))
            return
        }

        router.replace(boardHref)
    }

    const fatalError = loadError?.cardId === cardId ? loadError.message : null
    const loading = !fatalError && card?.id !== cardId

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (fatalError || !card) {
        return (
            <div className="flex flex-col gap-4">
                <BackLink href={boardHref} />
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Can&apos;t open this card</AlertTitle>
                    <AlertDescription>{fatalError ?? "Card not found"}</AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <BackLink href={boardHref} />
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-heading text-2xl font-medium">{card.title}</h1>
                    {card.isArchived && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Archived
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    Created by {card.creator.fullName} on{" "}
                    {new Date(card.createdAt).toLocaleDateString()}
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDetailsForm
                        card={card}
                        members={members}
                        onSaved={setCard}
                        onError={setError}
                    />
                </CardContent>
            </Card>

            <CommentsSection
                cardId={card.id}
                comments={card.comments}
                canModerate={adminId === user.id}
                onChange={(comments) => setCard({ ...card, comments })}
                onError={setError}
            />

            <AttachmentsSection
                cardId={card.id}
                attachments={card.attachments}
                canModerate={adminId === user.id}
                onChange={(attachments) => setCard({ ...card, attachments })}
                onError={setError}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Card actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" disabled={archiving} onClick={toggleArchived}>
                        {card.isArchived ? <ArchiveRestore /> : <ArchiveX />}
                        {card.isArchived ? "Restore to board" : "Archive card"}
                    </Button>

                    <ConfirmAction
                        title="Delete card"
                        description={`"${card.title}", its comments and its attachments will be permanently deleted.`}
                        confirmLabel="Delete card"
                        triggerClassName={cn(buttonVariants({ variant: "destructive" }))}
                        trigger="Delete card"
                        onConfirm={deleteCard}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

function BackLink({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
            <ArrowLeft className="size-4" />
            Back to board
        </Link>
    )
}
