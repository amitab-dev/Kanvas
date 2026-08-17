"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { toDateInputValue } from "@/lib/card-display"
import { cardDetailsSchema, type CardDetailsInput } from "@/lib/schemas/board"
import {
    CARD_PRIORITIES,
    CARD_STATUSES,
    type CardDetail,
    type CardPriority,
    type CardStatus,
    type Member,
} from "@/lib/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

const UNASSIGNED = ""

export function CardDetailsForm({
    card,
    members,
    onSaved,
    onError,
}: {
    card: CardDetail
    members: Member[]
    onSaved: (card: CardDetail) => void
    onError: (message: string | null) => void
}) {
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<CardDetailsInput>({
        resolver: zodResolver(cardDetailsSchema),
        defaultValues: {
            title: card.title,
            description: card.description,
            status: card.status,
            priority: card.priority,
            dueDate: toDateInputValue(card.dueDate),
            assignedTo: card.assignedTo ?? UNASSIGNED,
        },
    })

    // "" means "no value" in both selects and the date input; the API wants null.
    const assigneeLabels: Record<string, string> = {
        [UNASSIGNED]: "Unassigned",
        ...Object.fromEntries(members.map((member) => [member.userId, member.fullName])),
    }

    const onSubmit = async (values: CardDetailsInput) => {
        try {
            const { data } = await api.patch<ApiEnvelope<CardDetail>>(`/cards/${card.id}`, {
                title: values.title,
                description: values.description,
                status: values.status,
                priority: values.priority,
                dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
                assignedTo: values.assignedTo || null,
            })
            // PATCH returns the bare row, so the hydrated relations are kept —
            // except the assignee, which this form may have just changed.
            const assignee = members.find((member) => member.userId === data.data.assignedTo)

            onSaved({
                ...card,
                ...data.data,
                assignee: assignee
                    ? {
                          id: assignee.userId,
                          fullName: assignee.fullName,
                          email: assignee.email,
                          avatar: assignee.avatar,
                      }
                    : null,
            })
            onError(null)
            reset(values)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to save the card"))
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <div className="space-y-1">
                <Label htmlFor="card-title">Title</Label>
                <Input id="card-title" aria-invalid={!!errors.title} {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1">
                <Label htmlFor="card-description">Description</Label>
                <textarea
                    id="card-description"
                    rows={4}
                    aria-invalid={!!errors.description}
                    className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
                    {...register("description")}
                />
                {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label>Status</Label>
                    <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={(value) => field.onChange(value as CardStatus)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {CARD_STATUSES.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div className="space-y-1">
                    <Label>Priority</Label>
                    <Controller
                        control={control}
                        name="priority"
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={(value) => field.onChange(value as CardPriority)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {CARD_PRIORITIES.map((priority) => (
                                            <SelectItem key={priority} value={priority}>
                                                {priority}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div className="space-y-1">
                    <Label htmlFor="card-due-date">Due date</Label>
                    <Input id="card-due-date" type="date" {...register("dueDate")} />
                </div>

                <div className="space-y-1">
                    <Label>Assignee</Label>
                    <Controller
                        control={control}
                        name="assignedTo"
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={(value) => field.onChange(value ?? UNASSIGNED)}
                                items={assigneeLabels}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                                        {members.map((member) => (
                                            <SelectItem key={member.userId} value={member.userId}>
                                                {member.fullName}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div>
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting && <LoaderCircle className="animate-spin" />}
                    {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
            </div>
        </form>
    )
}
