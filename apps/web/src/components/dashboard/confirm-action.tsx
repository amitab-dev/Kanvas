"use client"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"
import { LoaderCircle } from "lucide-react"
import { useState } from "react"

/**
 * A destructive action behind a confirmation popover. `onConfirm` may throw —
 * the caller owns error reporting, this only manages the pending state.
 */
export function ConfirmAction({
    title,
    description,
    confirmLabel,
    trigger,
    triggerClassName,
    onConfirm,
}: {
    title: string
    description: string
    confirmLabel: string
    trigger: React.ReactNode
    triggerClassName?: string
    onConfirm: () => Promise<void>
}) {
    const [open, setOpen] = useState(false)
    const [pending, setPending] = useState(false)

    const confirm = async () => {
        setPending(true)
        try {
            await onConfirm()
            setOpen(false)
        } finally {
            setPending(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={triggerClassName}>{trigger}</PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                    <PopoverTitle>{title}</PopoverTitle>
                    <PopoverDescription>{description}</PopoverDescription>
                </PopoverHeader>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={confirm} disabled={pending}>
                        {pending && <LoaderCircle className="animate-spin" />}
                        {confirmLabel}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
