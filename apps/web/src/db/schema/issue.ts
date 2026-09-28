import {
  boolean,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { organization, team, user } from "./auth"

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id),
    userId: text("user_id").references(() => user.id),
    name: text("name").notNull(),
    description: text("description"),
    /** backlog | planned | in_progress | completed | canceled */
    status: text("status").notNull().default("backlog"),
    priority: integer("priority").notNull().default(0),
    lead: text("lead").references(() => user.id),
    startDate: timestamp("start_date"),
    targetDate: timestamp("target_date").notNull(),
    issuesCount: integer("issues_count").notNull().default(0),
    progress: integer("progress").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("project_organization_id_idx").on(table.organizationId)]
)

export const projectMember = pgTable(
  "project_member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
)

export const projectTeam = pgTable(
  "project_team",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.teamId] })]
)

export const projectActivityType = pgEnum("project_activity_type", [
  "comment",
  "created",
  "status-change",
  "priority-change",
  "lead-change",
  "member-change",
  "date-change",
  "team-change",
  "label-change",
  "name-change",
  "description-change",
])

export const projectActivity = pgTable(
  "project_activity",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    type: projectActivityType("type").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_activity_project_id_idx").on(table.projectId),
    index("project_activity_created_at_idx").on(table.createdAt),
  ]
)

/** Fixed workflow buckets — statuses are sorted within a category. */
export const issueStatusCategory = pgEnum("issue_status_category", [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
  "duplicate",
])

export const issueStatus = pgTable(
  "issue_status",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: issueStatusCategory("category").notNull(),
    /** Progress within category; may match another status (e.g. failed ≈ in progress). */
    sortOrder: integer("sort_order").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("issue_status_team_name_uidx").on(table.teamId, table.name),
  ]
)

export const label = pgTable(
  "label",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("label_org_name_uidx").on(table.organizationId, table.name),
    index("label_organization_id_idx").on(table.organizationId),
  ]
)

export const projectToLabel = pgTable(
  "project_to_label",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.labelId] })]
)

/**
 * Issues belong to a team. `id` is a stable UUID PK for FKs.
 * `number` is incremental per team (Engineering and Product can both have #1).
 */
export const issue = pgTable(
  "issue",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id),
    number: integer("number").notNull(),
    projectId: text("project_id").references(() => project.id),
    statusId: text("status_id").references(() => issueStatus.id),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: text("assignee_id").references(() => user.id),
    dueDate: timestamp("due_date"),
    priority: integer("priority"),
    estimatedHours: integer("estimated_hours"),
    /** Team cycle number (1-based from team.cyclesOrigin). Null = not in a cycle. */
    cycleNumber: integer("cycle_number"),
    attachments: text("attachments").array(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("issue_team_number_uidx").on(table.teamId, table.number),
    index("issue_project_id_idx").on(table.projectId),
    index("issue_assignee_id_idx").on(table.assigneeId),
    index("issue_status_id_idx").on(table.statusId),
    index("issue_team_cycle_number_idx").on(table.teamId, table.cycleNumber),
  ]
)

/** Many-to-many: issues ↔ labels. */
export const issueToLabel = pgTable(
  "issue_to_label",
  {
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.labelId] })]
)

export const issueRelationType = pgEnum("issue_relation_type", [
  "related-to",
  "parent-of",
  "sub-of",
])

export const relatedIssue = pgTable("related_issue", {
  id: text("id").primaryKey(),
  issueId: text("issue_id").references(() => issue.id),
  relatedIssueId: text("related_issue_id").references(() => issue.id),
  relationType: issueRelationType("relation_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const issueActivityType = pgEnum("issue_activity_type", [
  "comment",
  "status-change",
  "assignee-change",
  "due-date-change",
  "priority-change",
  "estimated-hours-change",
  "label-change",
  "created",
  "mention",
  "title-change",
  "description-change",
])

export const issueActivity = pgTable(
  "issue_activity",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    type: issueActivityType("type").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    message: text("message"),
    comment: text("comment"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("issue_activity_issue_id_idx").on(table.issueId),
    index("issue_activity_created_at_idx").on(table.createdAt),
  ]
)

export const issueSubscriberReason = pgEnum("issue_subscriber_reason", [
  "creator",
  "assignee",
  "mentioned",
  "manual",
])

/** Users who receive inbox notifications for issue activity. */
export const issueSubscriber = pgTable(
  "issue_subscriber",
  {
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: issueSubscriberReason("reason").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.userId] }),
    index("issue_subscriber_user_id_idx").on(table.userId),
  ]
)

export const inboxItemType = pgEnum("inbox_item_type", [
  "issue",
  "review",
  "team",
])

/**
 * Per-user inbox rows. Issue rows link to activity; review / team rows are
 * standalone (PR review stubs and team join requests).
 */
export const inboxNotification = pgTable(
  "inbox_notification",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: inboxItemType("type").notNull(),
    activityId: text("activity_id").references(() => issueActivity.id, {
      onDelete: "set null",
    }),
    issueId: text("issue_id").references(() => issue.id, {
      onDelete: "cascade",
    }),
    teamId: text("team_id").references(() => team.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isPriority: boolean("is_priority").notNull().default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inbox_notification_user_id_idx").on(table.userId),
    index("inbox_notification_org_user_idx").on(
      table.organizationId,
      table.userId
    ),
    index("inbox_notification_issue_id_idx").on(table.issueId),
    index("inbox_notification_team_id_idx").on(table.teamId),
  ]
)

/**
 * Forum-style comments on an issue. `parentId` links replies to a parent comment.
 */
export const issueComment = pgTable(
  "issue_comment",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "issue_comment_parent_id_fk",
    }).onDelete("cascade"),
    index("issue_comment_issue_id_idx").on(table.issueId),
    index("issue_comment_parent_id_idx").on(table.parentId),
  ]
)

export const issueCommentMentionType = pgEnum("issue_comment_mention_type", [
  "user",
  "issue",
])

/** Stored for future inbox notifications when someone is @-mentioned. */
export const issueCommentMention = pgTable(
  "issue_comment_mention",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => issueComment.id, { onDelete: "cascade" }),
    type: issueCommentMentionType("type").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    mentionedIssueId: text("mentioned_issue_id").references(() => issue.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("issue_comment_mention_comment_id_idx").on(table.commentId),
    index("issue_comment_mention_user_id_idx").on(table.userId),
  ]
)

/**
 * Forum-style comments on a project. `parentId` links replies to a parent comment.
 * Activity log events stay in `project_activity`; comments live here.
 */
export const projectComment = pgTable(
  "project_comment",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "project_comment_parent_id_fk",
    }).onDelete("cascade"),
    index("project_comment_project_id_idx").on(table.projectId),
    index("project_comment_parent_id_idx").on(table.parentId),
  ]
)

export const projectCommentMentionType = pgEnum(
  "project_comment_mention_type",
  ["user", "issue"]
)

/** Stored for future inbox notifications when someone is @-mentioned. */
export const projectCommentMention = pgTable(
  "project_comment_mention",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => projectComment.id, { onDelete: "cascade" }),
    type: projectCommentMentionType("type").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    mentionedIssueId: text("mentioned_issue_id").references(() => issue.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_comment_mention_comment_id_idx").on(table.commentId),
    index("project_comment_mention_user_id_idx").on(table.userId),
  ]
)

/**
 * Team documents (Linear-style). Always belong to a team; may optionally
 * link to a project and/or issue for context.
 */
export const teamDocument = pgTable(
  "document",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    issueId: text("issue_id").references(() => issue.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content"),
    ownerId: text("owner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("document_team_id_idx").on(table.teamId)]
)
