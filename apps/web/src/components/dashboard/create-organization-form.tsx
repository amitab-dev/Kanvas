"use client"

import { Button, buttonVariants } from "@/components/ui/button"
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
import {
    createOrganizationSchema,
    slugify,
    type CreateOrganizationInput,
} from "@/lib/schemas/organization"
import type { Organization } from "@/lib/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

export function CreateOrganizationForm({
    onCreated,
}: {
    onCreated: (organization: Organization) => void
}) {
    const [open, setOpen] = useState(false)
    const [slugTouched, setSlugTouched] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<CreateOrganizationInput>({
        resolver: zodResolver(createOrganizationSchema),
        defaultValues: { name: "", slug: "" },
    })

    const onSubmit = async (values: CreateOrganizationInput) => {
        try {
            const { data } = await api.post<ApiEnvelope<Organization>>("/organizations", values)
            onCreated(data.data)
        } catch (error) {
            setError("root", {
                message: apiErrorMessage(error, "Unable to create the organization"),
            })
            return
        }

        reset()
        setSlugTouched(false)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={buttonVariants()}>
                <Plus />
                New organization
            </PopoverTrigger>
            <PopoverContent align="end" className="w-88">
                <PopoverHeader>
                    <PopoverTitle>Create an organization</PopoverTitle>
                    <PopoverDescription>
                        You will be its admin and can invite teammates right after.
                    </PopoverDescription>
                </PopoverHeader>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="organization-name">Name</Label>
                        <Input
                            id="organization-name"
                            placeholder="Acme Inc"
                            aria-invalid={!!errors.name}
                            {...register("name", {
                                onChange: (event) => {
                                    if (slugTouched) return
                                    setValue("slug", slugify(event.target.value), {
                                        shouldValidate: false,
                                    })
                                },
                            })}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {errors.root && (
                        <p role="alert" className="text-sm text-destructive">
                            {errors.root.message}
                        </p>
                    )}

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <LoaderCircle className="animate-spin" />}
                        {isSubmitting ? "Creating..." : "Create organization"}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}
