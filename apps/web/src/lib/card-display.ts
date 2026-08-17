import type { CardPriority, CardStatus } from "@/lib/types"

/** Badge classes, kept together so a tile and the card page never disagree. */
export const statusStyles: Record<CardStatus, string> = {
    UPCOMING: "bg-muted text-muted-foreground",
    "IN PROGRESS": "bg-chart-1/15 text-chart-1",
    "IN REVIEW": "bg-chart-4/15 text-chart-4",
    DONE: "bg-chart-2/15 text-chart-2",
}

export const priorityStyles: Record<CardPriority, string> = {
    HIGH: "bg-destructive/10 text-destructive",
    MEDIUM: "bg-chart-4/15 text-chart-4",
    LOW: "bg-muted text-muted-foreground",
}

export const formatDueDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })

/** True once the due date is in the past, so overdue cards can stand out. */
export const isOverdue = (value: string) => new Date(value).getTime() < Date.now()

/** `<input type="date">` wants YYYY-MM-DD; the API returns an ISO timestamp. */
export const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : "")
