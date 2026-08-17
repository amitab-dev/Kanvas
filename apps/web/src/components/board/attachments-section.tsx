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
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { attachmentSchema, type AttachmentInput } from "@/lib/schemas/board"
import type { Attachment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { ExternalLink, LoaderCircle, Paperclip, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

export function AttachmentsSection({
    cardId,
    attachments,
    canModerate,
    onChange,
    onError,
}: {
    cardId: string
    attachments: Attachment[]

    canModerate: boolean
    onChange: (attachments: Attachment[]) => void
    onError: (message: string | null) => void
}) {
    const { user } = useSession()

    const deleteAttachment = async (attachmentId: string) => {
        try {
            await api.delete(`/attachments/${attachmentId}`)
            onChange(attachments.filter((attachment) => attachment.id !== attachmentId))
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to remove the attachment"))
        }
    }

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Attachments</CardTitle>
                <CardDescription>
                    {attachments.length === 0
                        ? "Nothing attached yet"
                        : `${attachments.length} file${attachments.length === 1 ? "" : "s"}`}
                </CardDescription>
                <CardAction>
                    <AddAttachmentForm
                        cardId={cardId}
                        onAdded={(attachment) => onChange([...attachments, attachment])}
                        onError={onError}
                    />
                </CardAction>
            </CardHeader>

            <CardContent className="gap-0">
                {attachments.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">
                        Attachments are links: upload the file elsewhere, then record its URL here.
                    </p>
                ) : (
                    <ul className="divide-y divide-border">
                        {attachments.map((attachment) => (
                            <li
                                key={attachment.id}
                                className="flex items-center justify-between gap-3 py-2.5"
                            >
                                <a
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="flex min-w-0 items-center gap-2 text-sm hover:underline"
                                >
                                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{attachment.fileName}</span>
                                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                                </a>

                                {(attachment.uploadedBy === user.id || canModerate) && (
                                    <ConfirmAction
                                        title="Remove attachment"
                                        description={`"${attachment.fileName}" will no longer be linked from this card.`}
                                        confirmLabel="Remove"
                                        triggerClassName={cn(
                                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                                            "text-destructive hover:bg-destructive/10",
                                        )}
                                        trigger={<Trash2 className="size-4" />}
                                        onConfirm={() => deleteAttachment(attachment.id)}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}

function AddAttachmentForm({
    cardId,
    onAdded,
    onError,
}: {
    cardId: string
    onAdded: (attachment: Attachment) => void
    onError: (message: string | null) => void
}) {
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AttachmentInput>({
        resolver: zodResolver(attachmentSchema),
        defaultValues: { fileName: "", fileUrl: "" },
    })

    const onSubmit = async (values: AttachmentInput) => {
        try {
            const { data } = await api.post<ApiEnvelope<Attachment>>(
                `/cards/${cardId}/attachments`,
                values,
            )
            onAdded(data.data)
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to attach the file"))
            return
        }

        reset()
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Paperclip />
                Attach link
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                    <PopoverTitle>Attach a file</PopoverTitle>
                    <PopoverDescription>
                        Kanvas stores the link, not the file itself.
                    </PopoverDescription>
                </PopoverHeader>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="attachment-name">File name</Label>
                        <Input
                            id="attachment-name"
                            placeholder="spec.pdf"
                            aria-invalid={!!errors.fileName}
                            {...register("fileName")}
                        />
                        {errors.fileName && (
                            <p className="text-xs text-destructive">{errors.fileName.message}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="attachment-url">URL</Label>
                        <Input
                            id="attachment-url"
                            placeholder="https://..."
                            aria-invalid={!!errors.fileUrl}
                            {...register("fileUrl")}
                        />
                        {errors.fileUrl && (
                            <p className="text-xs text-destructive">{errors.fileUrl.message}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <LoaderCircle className="animate-spin" />}
                        {isSubmitting ? "Attaching..." : "Attach"}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}
