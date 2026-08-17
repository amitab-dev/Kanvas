"use client"

import { ConfirmAction } from "@/components/dashboard/confirm-action"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { cardTitleSchema, listSchema, type CardTitleInput, type ListInput } from "@/lib/schemas/board"
import type { Card, List } from "@/lib/types"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { CardTile } from "@/components/board/card-tile"

export function ListColumn({
    list,
    cards,
    cardHref,
    isFirst,
    isLast,
    draggingCardId,
    onRenamed,
    onDeleted,
    onMoveList,
    onCardCreated,
    onCardDragStart,
    onCardDragEnd,
    onCardDrop,
    onError,
}: {
    list: List
    cards: Card[]
    cardHref: (cardId: string) => string
    isFirst: boolean
    isLast: boolean
    draggingCardId: string | null
    onRenamed: (list: List) => void
    onDeleted: (listId: string) => void
    onMoveList: (direction: -1 | 1) => void
    onCardCreated: (card: Card) => void
    onCardDragStart: (cardId: string, listId: string) => void
    onCardDragEnd: () => void
    onCardDrop: (listId: string, index: number) => void
    onError: (message: string | null) => void
}) {
    const [renaming, setRenaming] = useState(false)
    const [dropIndex, setDropIndex] = useState<number | null>(null)

    const deleteList = async () => {
        try {
            await api.delete(`/lists/${list.id}`)
            onDeleted(list.id)
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to delete the list"))
        }
    }

    const indexFromPointer = (container: HTMLElement, clientY: number) => {
        const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-card-tile]"))

        for (const [index, tile] of tiles.entries()) {
            const rect = tile.getBoundingClientRect()
            if (clientY < rect.top + rect.height / 2) {
                return index
            }
        }

        return tiles.length
    }

    return (
        <section className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5">
            <header className="flex items-start gap-1">
                {renaming ? (
                    <RenameListForm
                        list={list}
                        onRenamed={(renamed) => {
                            onRenamed(renamed)
                            setRenaming(false)
                        }}
                        onCancel={() => setRenaming(false)}
                        onError={onError}
                    />
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setRenaming(true)}
                            className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left text-sm font-medium outline-none hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
                            title="Rename list"
                        >
                            <span className="truncate">{list.name}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                                {cards.length}
                            </span>
                        </button>

                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${list.name} left`}
                            disabled={isFirst}
                            onClick={() => onMoveList(-1)}
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${list.name} right`}
                            disabled={isLast}
                            onClick={() => onMoveList(1)}
                        >
                            <ChevronRight />
                        </Button>
                        <ConfirmAction
                            title="Delete list"
                            description={`"${list.name}" and its cards will be removed. This cannot be undone.`}
                            confirmLabel="Delete list"
                            triggerClassName={cn(
                                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                                "text-destructive hover:bg-destructive/10",
                            )}
                            trigger={<Trash2 className="size-4" />}
                            onConfirm={deleteList}
                        />
                    </>
                )}
            </header>

            <div
                onDragOver={(event) => {
                    if (!draggingCardId) return

                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                    setDropIndex(indexFromPointer(event.currentTarget, event.clientY))
                }}
                onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                    setDropIndex(null)
                }}
                onDrop={(event) => {
                    if (!draggingCardId) return
                    event.preventDefault()
                    onCardDrop(list.id, indexFromPointer(event.currentTarget, event.clientY))
                    setDropIndex(null)
                }}
                className="flex min-h-16 flex-col gap-2"
            >
                {cards.map((card, index) => (
                    <div key={card.id} className="flex flex-col gap-2">
                        {dropIndex === index && <DropIndicator />}
                        <CardTile
                            card={card}
                            href={cardHref(card.id)}
                            dragging={draggingCardId === card.id}
                            onDragStart={() => onCardDragStart(card.id, list.id)}
                            onDragEnd={onCardDragEnd}
                        />
                    </div>
                ))}

                {dropIndex === cards.length && <DropIndicator />}

                {cards.length === 0 && dropIndex === null && (
                    <p className="px-1 py-3 text-xs text-muted-foreground">No cards yet</p>
                )}
            </div>

            <CardComposer listId={list.id} onCreated={onCardCreated} onError={onError} />
        </section>
    )
}

function DropIndicator() {
    return <div className="h-0.5 rounded-full bg-primary" />
}

function RenameListForm({
    list,
    onRenamed,
    onCancel,
    onError,
}: {
    list: List
    onRenamed: (list: List) => void
    onCancel: () => void
    onError: (message: string | null) => void
}) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ListInput>({
        resolver: zodResolver(listSchema),
        defaultValues: { name: list.name },
    })

    const onSubmit = async (values: ListInput) => {
        try {
            const { data } = await api.patch<ApiEnvelope<List>>(`/lists/${list.id}`, values)
            onRenamed(data.data)
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to rename the list"))
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full items-center gap-1">
            <Input autoFocus aria-invalid={!!errors.name} className="h-8" {...register("name")} />
            <Button type="submit" size="icon-sm" aria-label="Save list name" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Check />}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Cancel rename"
                onClick={onCancel}
            >
                <X />
            </Button>
        </form>
    )
}

function CardComposer({
    listId,
    onCreated,
    onError,
}: {
    listId: string
    onCreated: (card: Card) => void
    onError: (message: string | null) => void
}) {
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CardTitleInput>({
        resolver: zodResolver(cardTitleSchema),
        defaultValues: { title: "" },
    })

    const onSubmit = async (values: CardTitleInput) => {
        try {
            const { data } = await api.post<ApiEnvelope<Card>>(`/lists/${listId}/cards`, values)
            onCreated(data.data)
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to create the card"))
            return
        }

        reset()
    }

    if (!open) {
        return (
            <Button variant="ghost" className="justify-start" onClick={() => setOpen(true)}>
                <Plus />
                Add card
            </Button>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
            <Input
                autoFocus
                placeholder="Card title"
                aria-invalid={!!errors.title}
                {...register("title")}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    Add card
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        reset()
                        setOpen(false)
                    }}
                >
                    Cancel
                </Button>
            </div>
        </form>
    )
}
