"use client"

import { ConfirmAction } from "@/components/dashboard/confirm-action"
import { useSession } from "@/components/session-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { initials } from "@/lib/initials"
import { commentSchema, type CommentInput } from "@/lib/schemas/board"
import type { CardComment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"

export function CommentsSection({
    cardId,
    comments,
    canModerate,
    onChange,
    onError,
}: {
    cardId: string
    comments: CardComment[]

    canModerate: boolean
    onChange: (comments: CardComment[]) => void
    onError: (message: string | null) => void
}) {
    const { user } = useSession()

    const thread = [...comments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CommentInput>({
        resolver: zodResolver(commentSchema),
        defaultValues: { comment: "" },
    })

    const onSubmit = async (values: CommentInput) => {
        try {
            const { data } = await api.post<ApiEnvelope<Omit<CardComment, "user">>>(
                `/cards/${cardId}/comments`,
                values,
            )

            onChange([
                ...comments,
                {
                    ...data.data,
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        avatar: user.avatar,
                    },
                },
            ])
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to post the comment"))
            return
        }

        reset()
    }

    const deleteComment = async (commentId: string) => {
        try {
            await api.delete(`/comments/${commentId}`)
            onChange(comments.filter((comment) => comment.id !== commentId))
            onError(null)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to delete the comment"))
        }
    }

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Comments</CardTitle>
                <CardDescription>
                    {comments.length === 0
                        ? "No comments yet"
                        : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
                    <textarea
                        rows={3}
                        placeholder="Write a comment..."
                        aria-invalid={!!errors.comment}
                        aria-label="Comment"
                        className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
                        {...register("comment")}
                    />
                    {errors.comment && (
                        <p className="text-xs text-destructive">{errors.comment.message}</p>
                    )}
                    <div>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting && <LoaderCircle className="animate-spin" />}
                            Comment
                        </Button>
                    </div>
                </form>

                {thread.length > 0 && (
                    <ul className="divide-y divide-border">
                        {thread.map((comment) => (
                            <li key={comment.id} className="flex items-start gap-3 py-3">
                                <Avatar size="sm">
                                    {comment.user.avatar && (
                                        <AvatarImage src={comment.user.avatar} alt="" />
                                    )}
                                    <AvatarFallback>
                                        {initials(comment.user.fullName)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">
                                        {comment.user.fullName} ·{" "}
                                        {new Date(comment.createdAt).toLocaleString()}
                                    </p>
                                    <p className="text-sm break-words whitespace-pre-wrap">
                                        {comment.comment}
                                    </p>
                                </div>

                                {(comment.userId === user.id || canModerate) && (
                                    <ConfirmAction
                                        title="Delete comment"
                                        description="This comment will be removed for everyone."
                                        confirmLabel="Delete"
                                        triggerClassName={cn(
                                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                                            "text-destructive hover:bg-destructive/10",
                                        )}
                                        trigger={<Trash2 className="size-4" />}
                                        onConfirm={() => deleteComment(comment.id)}
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
