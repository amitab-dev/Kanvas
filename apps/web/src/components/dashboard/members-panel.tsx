"use client"

import { ConfirmAction } from "@/components/dashboard/confirm-action"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { api, apiErrorMessage } from "@/lib/api"
import { initials } from "@/lib/initials"
import { addMemberSchema, type AddMemberInput } from "@/lib/schemas/organization"
import type { Member } from "@/lib/types"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, UserMinus, UserPlus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

export function MembersPanel({
    organizationId,
    adminId,
    currentUserId,
    members,
    onReload,
    onError,
}: {
    organizationId: string
    adminId: string
    currentUserId: string
    members: Member[]
    onReload: () => Promise<void>
    onError: (message: string | null) => void
}) {
    const isAdmin = adminId === currentUserId

    const removeMember = async (userId: string) => {
        try {
            await api.delete(`/organizations/${organizationId}/members/${userId}`)
            onError(null)
            await onReload()
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to remove the member"))
        }
    }

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Members</CardTitle>
                <CardDescription>
                    {members.length} {members.length === 1 ? "person" : "people"} in this
                    organization
                </CardDescription>
                {isAdmin && (
                    <CardAction>
                        <AddMemberForm
                            organizationId={organizationId}
                            onAdded={onReload}
                            onError={onError}
                        />
                    </CardAction>
                )}
            </CardHeader>

            <CardContent className="gap-0">
                <ul className="divide-y divide-border">
                    {members.map((member) => {
                        const memberIsAdmin = member.userId === adminId

                        return (
                            <li
                                key={member.id}
                                className="flex items-center justify-between gap-3 py-2.5"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar>
                                        {member.avatar && <AvatarImage src={member.avatar} alt="" />}
                                        <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">
                                            {member.fullName}
                                            {member.userId === currentUserId && (
                                                <span className="text-muted-foreground"> (you)</span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {memberIsAdmin ? "Admin" : "Member"}
                                    </span>
                                    {isAdmin && !memberIsAdmin && (
                                        <ConfirmAction
                                            title="Remove member"
                                            description={`${member.fullName} will lose access to this organization and its boards.`}
                                            confirmLabel="Remove"
                                            triggerClassName={cn(
                                                buttonVariants({
                                                    variant: "ghost",
                                                    size: "icon-sm",
                                                }),
                                                "text-destructive hover:bg-destructive/10",
                                            )}
                                            trigger={<UserMinus className="size-4" />}
                                            onConfirm={() => removeMember(member.userId)}
                                        />
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </CardContent>
        </Card>
    )
}

function AddMemberForm({
    organizationId,
    onAdded,
    onError,
}: {
    organizationId: string
    onAdded: () => Promise<void>
    onError: (message: string | null) => void
}) {
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<AddMemberInput>({
        resolver: zodResolver(addMemberSchema),
        defaultValues: { email: "" },
    })

    const onSubmit = async (values: AddMemberInput) => {
        try {
            await api.post(`/organizations/${organizationId}/members`, values)
            onError(null)
            await onAdded()
        } catch (error) {

            setError("email", { message: apiErrorMessage(error, "Unable to add the member") })
            return
        }

        reset()
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                <UserPlus />
                Add member
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                    <PopoverTitle>Add a member</PopoverTitle>
                    <PopoverDescription>
                        They need a Kanvas account with this email address.
                    </PopoverDescription>
                </PopoverHeader>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="member-email">Email</Label>
                        <Input
                            id="member-email"
                            type="email"
                            placeholder="teammate@example.com"
                            aria-invalid={!!errors.email}
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <LoaderCircle className="animate-spin" />}
                        {isSubmitting ? "Adding..." : "Add member"}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}
