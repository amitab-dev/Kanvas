"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { listSchema, type ListInput } from "@/lib/schemas/board"
import type { List } from "@/lib/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

export function AddListForm({
    boardId,
    onCreated,
    onError,
}: {
    boardId: string
    onCreated: (list: List) => void
    onError: (message: string | null) => void
}) {
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ListInput>({
        resolver: zodResolver(listSchema),
        defaultValues: { name: "" },
    })

    const onSubmit = async (values: ListInput) => {
        try {
            const { data } = await api.post<ApiEnvelope<List>>(`/boards/${boardId}/lists`, values)
            onCreated(data.data)
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to create the list"))
            return
        }

        reset()
        setOpen(false)
    }

    if (!open) {
        return (
            <Button
                variant="ghost"
                className="h-fit w-72 shrink-0 justify-start rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5"
                onClick={() => setOpen(true)}
            >
                <Plus />
                Add list
            </Button>
        )
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5"
        >
            <Input
                autoFocus
                placeholder="List name"
                aria-invalid={!!errors.name}
                {...register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    Add list
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
