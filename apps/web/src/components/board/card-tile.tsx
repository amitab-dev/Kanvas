"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDueDate, isOverdue, priorityStyles, statusStyles } from "@/lib/card-display"
import { initials } from "@/lib/initials"
import type { Card } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CalendarClock } from "lucide-react"
import Link from "next/link"

export function CardTile({
    card,
    href,
    dragging,
    onDragStart,
    onDragEnd,
}: {
    card: Card
    href: string
    dragging: boolean
    onDragStart: () => void
    onDragEnd: () => void
}) {
    return (
        <Link
            href={href}
            data-card-tile
            draggable
            onDragStart={(event) => {

                event.dataTransfer.setData("text/plain", card.id)
                event.dataTransfer.effectAllowed = "move"
                onDragStart()
            }}
            onDragEnd={onDragEnd}
            className={cn(
                "flex flex-col gap-2 rounded-lg bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
                dragging && "opacity-40",
            )}
        >
            <p className="font-medium">{card.title}</p>

            {card.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
                <span
                    className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        statusStyles[card.status],
                    )}
                >
                    {card.status}
                </span>
                <span
                    className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        priorityStyles[card.priority],
                    )}
                >
                    {card.priority}
                </span>

                {card.dueDate && (
                    <span
                        className={cn(
                            "flex items-center gap-1 text-[11px]",
                            isOverdue(card.dueDate) ? "text-destructive" : "text-muted-foreground",
                        )}
                    >
                        <CalendarClock className="size-3" />
                        {formatDueDate(card.dueDate)}
                    </span>
                )}

                {card.assignee && (
                    <Avatar size="sm" className="ml-auto" title={card.assignee.fullName}>
                        {card.assignee.avatar && <AvatarImage src={card.assignee.avatar} alt="" />}
                        <AvatarFallback>{initials(card.assignee.fullName)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </Link>
    )
}
