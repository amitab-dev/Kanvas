"use client"

import { AddListForm } from "@/components/board/add-list-form"
import { ListColumn } from "@/components/board/list-column"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import type { BoardDetail, Card, List } from "@/lib/types"
import { ArrowLeft, CircleAlert } from "lucide-react"
import Link from "next/link"
import { use, useCallback, useEffect, useState } from "react"

type CardsByList = Record<string, Card[]>

export default function BoardPage(props: PageProps<"/dashboard/[organizationId]/boards/[boardId]">) {
    const { organizationId, boardId } = use(props.params)

    const [board, setBoard] = useState<BoardDetail | null>(null)
    const [lists, setLists] = useState<List[]>([])
    const [cards, setCards] = useState<CardsByList>({})
    const [error, setError] = useState<string | null>(null)

    const [loadError, setLoadError] = useState<{ boardId: string; message: string } | null>(null)
    const [drag, setDrag] = useState<{ cardId: string; listId: string } | null>(null)

    const reloadCards = useCallback(async (listId: string) => {
        const { data } = await api.get<ApiEnvelope<Card[]>>(`/lists/${listId}/cards`)
        setCards((current) => ({ ...current, [listId]: data.data }))
    }, [])

    useEffect(() => {
        let active = true

        const load = async () => {
            try {
                const { data } = await api.get<ApiEnvelope<BoardDetail>>(`/boards/${boardId}`)
                const boardLists = [...data.data.lists].sort((a, b) => a.position - b.position)

                const columns = await Promise.all(
                    boardLists.map(async (list) => {
                        const response = await api.get<ApiEnvelope<Card[]>>(
                            `/lists/${list.id}/cards`,
                        )
                        return [list.id, response.data.data] as const
                    }),
                )

                if (!active) return
                setBoard(data.data)
                setLists(boardLists)
                setCards(Object.fromEntries(columns))
                setLoadError(null)
            } catch (loadFailure) {
                if (!active) return
                setLoadError({
                    boardId,
                    message: apiErrorMessage(loadFailure, "Unable to load this board"),
                })
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [boardId])

    const moveList = async (listId: string, direction: -1 | 1) => {
        const from = lists.findIndex((list) => list.id === listId)
        const to = from + direction
        if (from < 0 || to < 0 || to >= lists.length) return

        const reordered = [...lists]
        const [moved] = reordered.splice(from, 1)
        reordered.splice(to, 0, moved!)
        setLists(reordered)

        try {
            await api.patch(`/lists/${listId}/move`, {
                previousId: reordered[to - 1]?.id,
                nextId: reordered[to + 1]?.id,
            })
            setError(null)
        } catch (moveError) {
            setLists(lists)
            setError(apiErrorMessage(moveError, "Unable to move the list"))
        }
    }

    const dropCard = async (targetListId: string, index: number) => {
        if (!drag) return

        const sourceListId = drag.listId
        const source = cards[sourceListId] ?? []
        const card = source.find((item) => item.id === drag.cardId)
        if (!card) return

        const previousCards = cards
        const target = (cards[targetListId] ?? []).filter((item) => item.id !== drag.cardId)

        const from = source.findIndex((item) => item.id === drag.cardId)
        const insertAt = sourceListId === targetListId && from < index ? index - 1 : index

        if (sourceListId === targetListId && from === insertAt) {
            setDrag(null)
            return
        }

        const moved = { ...card, listId: targetListId }
        target.splice(insertAt, 0, moved)

        setCards({
            ...cards,
            [sourceListId]: source.filter((item) => item.id !== drag.cardId),
            [targetListId]: target,
        })
        setDrag(null)

        try {
            await api.patch(`/cards/${card.id}/move`, {
                listId: targetListId,
                previousId: target[insertAt - 1]?.id,
                nextId: target[insertAt + 1]?.id,
            })
            setError(null)
        } catch (moveError) {
            setCards(previousCards)
            setError(apiErrorMessage(moveError, "Unable to move the card"))
            await Promise.all(
                [...new Set([sourceListId, targetListId])].map((listId) => reloadCards(listId)),
            )
        }
    }

    const fatalError = loadError?.boardId === boardId ? loadError.message : null
    const loading = !fatalError && board?.id !== boardId

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-10 w-64" />
                <div className="flex gap-4">
                    {[0, 1, 2].map((key) => (
                        <Skeleton key={key} className="h-96 w-72" />
                    ))}
                </div>
            </div>
        )
    }

    if (fatalError || !board) {
        return (
            <div className="flex flex-col gap-4">
                <BackLink organizationId={organizationId} />
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Can&apos;t open this board</AlertTitle>
                    <AlertDescription>{fatalError ?? "Board not found"}</AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <BackLink organizationId={organizationId} />
                <div>
                    <h1 className="font-heading text-2xl font-medium">{board.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        Created by {board.creator.fullName}
                    </p>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex items-start gap-4 overflow-x-auto pb-4">
                {lists.map((list, index) => (
                    <ListColumn
                        key={list.id}
                        list={list}
                        cards={cards[list.id] ?? []}
                        cardHref={(cardId) =>
                            `/dashboard/${organizationId}/boards/${boardId}/cards/${cardId}`
                        }
                        isFirst={index === 0}
                        isLast={index === lists.length - 1}
                        draggingCardId={drag?.cardId ?? null}
                        onRenamed={(renamed) =>
                            setLists((current) =>
                                current.map((item) => (item.id === renamed.id ? renamed : item)),
                            )
                        }
                        onDeleted={(listId) => {
                            setLists((current) => current.filter((item) => item.id !== listId))
                            setCards((current) => {
                                const { [listId]: removed, ...rest } = current
                                void removed
                                return rest
                            })
                        }}
                        onMoveList={(direction) => void moveList(list.id, direction)}
                        onCardCreated={(card) =>
                            setCards((current) => ({
                                ...current,
                                [list.id]: [...(current[list.id] ?? []), card],
                            }))
                        }
                        onCardDragStart={(cardId, listId) => setDrag({ cardId, listId })}
                        onCardDragEnd={() => setDrag(null)}
                        onCardDrop={(listId, index) => void dropCard(listId, index)}
                        onError={setError}
                    />
                ))}

                <AddListForm
                    boardId={board.id}
                    onCreated={(list) => {
                        setLists((current) => [...current, list])
                        setCards((current) => ({ ...current, [list.id]: [] }))
                    }}
                    onError={setError}
                />
            </div>
        </div>
    )
}

function BackLink({ organizationId }: { organizationId: string }) {
    return (
        <Link
            href={`/dashboard/${organizationId}`}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
            <ArrowLeft className="size-4" />
            Back to organization
        </Link>
    )
}
