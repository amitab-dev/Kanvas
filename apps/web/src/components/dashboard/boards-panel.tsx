"use client"

import { ConfirmAction } from "@/components/dashboard/confirm-action"
import { useSession } from "@/components/session-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"
import Link from "next/link"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { boardSchema, type BoardInput } from "@/lib/schemas/organization"
import type { Board } from "@/lib/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { Check, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

export function BoardsPanel({
    organizationId,
    adminId,
    boards,
    onChange,
    onError,
}: {
    organizationId: string
    adminId: string
    boards: Board[]
    onChange: (boards: Board[]) => void
    onError: (message: string | null) => void
}) {
    const { user } = useSession()
    const [editingId, setEditingId] = useState<string | null>(null)

    const canManage = (board: Board) =>
        board.createdBy === user.id || adminId === user.id

    const createBoard = (board: CreatedBoard) =>
        onChange([...boards, { ...board, creatorName: user.fullName }])

    const renameBoard = (updated: Board) =>
        onChange(boards.map((board) => (board.id === updated.id ? { ...board, ...updated } : board)))

    const deleteBoard = async (boardId: string) => {
        try {
            await api.delete(`/boards/${boardId}`)
            onChange(boards.filter((board) => board.id !== boardId))
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to delete the board"))
        }
    }

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Boards</CardTitle>
                <CardDescription>
                    {boards.length === 0
                        ? "No boards in this organization yet"
                        : `${boards.length} board${boards.length === 1 ? "" : "s"}`}
                </CardDescription>
                <CardAction>
                    <CreateBoardForm
                        organizationId={organizationId}
                        onCreated={createBoard}
                        onError={onError}
                    />
                </CardAction>
            </CardHeader>

            <CardContent className="gap-0">
                {boards.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">
                        Create a board to start organising work into lists and cards.
                    </p>
                ) : (
                    <ul className="divide-y divide-border">
                        {boards.map((board) => (
                            <li
                                key={board.id}
                                className="flex items-center justify-between gap-3 py-2.5"
                            >
                                {editingId === board.id ? (
                                    <RenameBoardForm
                                        board={board}
                                        onRenamed={(updated) => {
                                            renameBoard(updated)
                                            setEditingId(null)
                                        }}
                                        onCancel={() => setEditingId(null)}
                                        onError={onError}
                                    />
                                ) : (
                                    <>
                                        <Link
                                            href={`/dashboard/${organizationId}/boards/${board.id}`}
                                            className="min-w-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                        >
                                            <p className="truncate font-medium hover:underline">
                                                {board.name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                Created by {board.creatorName}
                                            </p>
                                        </Link>
                                        {canManage(board) && (
                                            <div className="flex shrink-0 items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label={`Rename ${board.name}`}
                                                    onClick={() => setEditingId(board.id)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <ConfirmAction
                                                    title="Delete board"
                                                    description={`"${board.name}" and everything inside it will be removed. This cannot be undone.`}
                                                    confirmLabel="Delete board"
                                                    triggerClassName={cn(
                                                        buttonVariants({
                                                            variant: "ghost",
                                                            size: "icon-sm",
                                                        }),
                                                        "text-destructive hover:bg-destructive/10",
                                                    )}
                                                    trigger={<Trash2 className="size-4" />}
                                                    onConfirm={() => deleteBoard(board.id)}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}

type CreatedBoard = Omit<Board, "creatorName">

function CreateBoardForm({
    organizationId,
    onCreated,
    onError,
}: {
    organizationId: string
    onCreated: (board: CreatedBoard) => void
    onError: (message: string | null) => void
}) {
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<BoardInput>({
        resolver: zodResolver(boardSchema),
        defaultValues: { name: "" },
    })

    const onSubmit = async (values: BoardInput) => {
        try {
            const { data } = await api.post<ApiEnvelope<CreatedBoard>>(
                `/organizations/${organizationId}/boards`,
                values,
            )
            onCreated(data.data)
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to create the board"))
            return
        }

        reset()
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Plus />
                New board
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                    <PopoverTitle>Create a board</PopoverTitle>
                </PopoverHeader>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="board-name">Name</Label>
                        <Input
                            id="board-name"
                            placeholder="Product roadmap"
                            aria-invalid={!!errors.name}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <LoaderCircle className="animate-spin" />}
                        {isSubmitting ? "Creating..." : "Create board"}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}

function RenameBoardForm({
    board,
    onRenamed,
    onCancel,
    onError,
}: {
    board: Board
    onRenamed: (board: Board) => void
    onCancel: () => void
    onError: (message: string | null) => void
}) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<BoardInput>({
        resolver: zodResolver(boardSchema),
        defaultValues: { name: board.name },
    })

    const onSubmit = async (values: BoardInput) => {
        try {
            const { data } = await api.patch<ApiEnvelope<CreatedBoard>>(
                `/boards/${board.id}`,
                values,
            )
            onRenamed({ ...board, ...data.data })
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to rename the board"))
        }
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex w-full items-center gap-2"
        >
            <div className="min-w-0 flex-1">
                <Input autoFocus aria-invalid={!!errors.name} {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <Button type="submit" size="icon-sm" aria-label="Save board name" disabled={isSubmitting}>
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
