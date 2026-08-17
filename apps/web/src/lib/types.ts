export type User = {
    id: string
    fullName: string
    email: string
    role: string
    avatar: string | null
    createdAt: string
    updatedAt: string | null
}

export type PublicUser = Pick<User, "id" | "fullName" | "email" | "avatar">

export type Organization = {
    id: string
    name: string
    slug: string
    adminId: string
    createdAt: string
    updatedAt: string | null
}

export type OrganizationDetail = Organization & {
    admin: PublicUser
    members: { id: string; userId: string; createdAt: string; user: PublicUser }[]
}

export type Member = {
    id: string
    userId: string
    fullName: string
    email: string
    avatar: string | null
    joinedAt: string
}

export type Board = {
    id: string
    name: string
    organizationId: string
    createdBy: string
    creatorName: string
    createdAt: string
    updatedAt: string | null
}

export type BoardDetail = Omit<Board, "creatorName"> & {
    creator: PublicUser
    lists: List[]
}

export type List = {
    id: string
    boardId: string
    name: string
    position: number
    createdAt: string
    updatedAt: string | null
}

export const CARD_STATUSES = ["UPCOMING", "IN PROGRESS", "IN REVIEW", "DONE"] as const
export const CARD_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const

export type CardStatus = (typeof CARD_STATUSES)[number]
export type CardPriority = (typeof CARD_PRIORITIES)[number]

export type Card = {
    id: string
    listId: string
    title: string
    description: string
    dueDate: string | null
    position: number
    isArchived: boolean
    createdBy: string
    assignedTo: string | null
    status: CardStatus
    priority: CardPriority
    createdAt: string
    updatedAt: string | null
    assignee?: PublicUser | null
}

export type CardDetail = Card & {
    creator: PublicUser
    assignee: PublicUser | null
    comments: CardComment[]
    attachments: Attachment[]
}

export type CardComment = {
    id: string
    cardId: string
    userId: string
    comment: string
    createdAt: string
    user: PublicUser
}

export type Attachment = {
    id: string
    cardId: string
    uploadedBy: string
    fileUrl: string
    fileName: string
    createdAt: string
}
