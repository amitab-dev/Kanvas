"use client"

import { ConfirmAction } from "@/components/dashboard/confirm-action"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { api, apiErrorMessage, type ApiEnvelope } from "@/lib/api"
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/schemas/organization"
import type { Organization } from "@/lib/types"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

export function OrganizationSettings({
    organization,
    isAdmin,
    onUpdated,
    onError,
}: {
    organization: Organization
    isAdmin: boolean
    onUpdated: (organization: Organization) => void
    onError: (message: string | null) => void
}) {
    const router = useRouter()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<UpdateOrganizationInput>({
        resolver: zodResolver(updateOrganizationSchema),
        defaultValues: { name: organization.name, slug: organization.slug },
    })

    const onSubmit = async (values: UpdateOrganizationInput) => {
        try {
            const { data } = await api.patch<ApiEnvelope<Organization>>(
                `/organizations/${organization.id}`,
                values,
            )
            onUpdated(data.data)
            onError(null)
            reset({ name: data.data.name, slug: data.data.slug })
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to update the organization"))
        }
    }

    const deleteOrganization = async () => {
        try {
            await api.delete(`/organizations/${organization.id}`)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to delete the organization"))
            return
        }

        router.replace("/dashboard")
    }

    const leaveOrganization = async () => {
        try {
            await api.post(`/organizations/${organization.id}/leave`)
        } catch (error) {
            onError(apiErrorMessage(error, "Unable to leave the organization"))
            return
        }

        router.replace("/dashboard")
    }

    if (!isAdmin) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Membership</CardTitle>
                    <CardDescription>
                        Only the admin can rename or delete this organization.
                    </CardDescription>
                </CardHeader>
                <CardContent className="items-start">
                    <ConfirmAction
                        title="Leave organization"
                        description={`You will lose access to ${organization.name} and its boards. The admin can add you back later.`}
                        confirmLabel="Leave"
                        triggerClassName={cn(buttonVariants({ variant: "destructive" }))}
                        trigger="Leave organization"
                        onConfirm={leaveOrganization}
                    />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Rename this organization or change its slug.</CardDescription>
            </CardHeader>

            <CardContent>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="flex flex-col gap-4 sm:max-w-md"
                >
                    <div className="space-y-1">
                        <Label htmlFor="settings-name">Name</Label>
                        <Input
                            id="settings-name"
                            aria-invalid={!!errors.name}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="settings-slug">Slug</Label>
                        <Input
                            id="settings-slug"
                            aria-invalid={!!errors.slug}
                            {...register("slug")}
                        />
                        {errors.slug && (
                            <p className="text-xs text-destructive">{errors.slug.message}</p>
                        )}
                    </div>

                    <div>
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting && <LoaderCircle className="animate-spin" />}
                            {isSubmitting ? "Saving..." : "Save changes"}
                        </Button>
                    </div>
                </form>

                <Separator className="my-2" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="font-medium text-destructive">Delete organization</p>
                        <p className="text-sm text-muted-foreground">
                            Removes every board, list and card it contains.
                        </p>
                    </div>
                    <ConfirmAction
                        title="Delete organization"
                        description={`${organization.name} and all of its boards will be permanently deleted. This cannot be undone.`}
                        confirmLabel="Delete organization"
                        triggerClassName={cn(buttonVariants({ variant: "destructive" }))}
                        trigger="Delete"
                        onConfirm={deleteOrganization}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
