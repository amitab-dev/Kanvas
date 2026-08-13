import { relations } from "drizzle-orm";
import { boolean, pgEnum, pgTable, PgVector, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password"),
    role: varchar("role", { length: 50 }).$type<"USER" | "PLATFORM">().default("USER"),
    avatar: text("avatar").notNull().default(""),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().$onUpdateFn(() => new Date(Date.now()))
}).enableRLS();

export const organizationTable = pgTable("organizations", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 25 }).notNull().unique(),
    adminId: uuid("admin_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().$onUpdateFn(() => new Date(Date.now()))
}).enableRLS();

export const membersTable = pgTable("members", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizationTable.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const boardsTable = pgTable("boards", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("board_name", { length: 200 }).notNull(),
    organizationId: uuid("organization_id").references(() => organizationTable.id, { onDelete: "cascade" }).notNull(),
    createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().$onUpdateFn(() => new Date(Date.now()))
}).enableRLS()

export const listsTable = pgTable("lists", {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id").references(() => boardsTable.id, { onDelete: "cascade" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().$onUpdateFn(() => new Date(Date.now()))
}).enableRLS()

export const cardPriority = pgEnum("card_priority", ["HIGH", "MEDIUM", "LOW"])
export const cardStatus = pgEnum("card_status", ["UPCOMING", "IN PROGRESS", "IN REVIEW", "DONE"])

export const cardsTable = pgTable("cards", {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id").references(() => listsTable.id, { onDelete: "cascade" }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    description: varchar("description", { length: 250 }).notNull(),
    dueDate: timestamp("due_date", { mode: "date", withTimezone: true }).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    assignedTo: uuid("assigned_to").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    status: cardStatus("status").default("IN PROGRESS").notNull(),
    priority: cardPriority("priority").default("MEDIUM").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().$onUpdateFn(() => new Date(Date.now()))
}).enableRLS()

export const attachmentsTable = pgTable("attachments", {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").references(() => cardsTable.id, { onDelete: "cascade" }).notNull(),
    uploadedBy: uuid("uploaded_by").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}).enableRLS()

export const commentsTable = pgTable("comments", {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").references(() => cardsTable.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}).enableRLS()

export const usersRelations = relations(usersTable, ({ many }) => ({
    ownedOrganizations: many(organizationTable),
    memberships: many(membersTable),
    createdBoards: many(boardsTable),
    createdCards: many(cardsTable, { relationName: "card_creator" }),
    assignedCards: many(cardsTable, { relationName: "card_assignee" }),
    attachments: many(attachmentsTable),
    comments: many(commentsTable),
}))

export const organizationRelations = relations(organizationTable, ({ one, many }) => ({
    admin: one(usersTable, {
        fields: [organizationTable.adminId],
        references: [usersTable.id],
    }),
    members: many(membersTable),
    boards: many(boardsTable),
}))

export const membersRelations = relations(membersTable, ({ one }) => ({
    organization: one(organizationTable, {
        fields: [membersTable.organizationId],
        references: [organizationTable.id],
    }),
    user: one(usersTable, {
        fields: [membersTable.userId],
        references: [usersTable.id],
    }),
}))

export const boardsRelations = relations(boardsTable, ({ one, many }) => ({
    organization: one(organizationTable, {
        fields: [boardsTable.organizationId],
        references: [organizationTable.id],
    }),
    creator: one(usersTable, {
        fields: [boardsTable.createdBy],
        references: [usersTable.id],
    }),
    lists: many(listsTable),
}))

export const listsRelations = relations(listsTable, ({ one, many }) => ({
    board: one(boardsTable, {
        fields: [listsTable.boardId],
        references: [boardsTable.id],
    }),
    cards: many(cardsTable),
}))

export const cardsRelations = relations(cardsTable, ({ one, many }) => ({
    list: one(listsTable, {
        fields: [cardsTable.listId],
        references: [listsTable.id],
    }),
    creator: one(usersTable, {
        fields: [cardsTable.createdBy],
        references: [usersTable.id],
        relationName: "card_creator",
    }),
    assignee: one(usersTable, {
        fields: [cardsTable.assignedTo],
        references: [usersTable.id],
        relationName: "card_assignee",
    }),
    attachments: many(attachmentsTable),
    comments: many(commentsTable),
}))

export const attachmentsRelations = relations(attachmentsTable, ({ one }) => ({
    card: one(cardsTable, {
        fields: [attachmentsTable.cardId],
        references: [cardsTable.id],
    }),
    uploader: one(usersTable, {
        fields: [attachmentsTable.uploadedBy],
        references: [usersTable.id],
    }),
}))

export const commentsRelations = relations(commentsTable, ({ one }) => ({
    card: one(cardsTable, {
        fields: [commentsTable.cardId],
        references: [cardsTable.id],
    }),
    user: one(usersTable, {
        fields: [commentsTable.userId],
        references: [usersTable.id],
    }),
}))