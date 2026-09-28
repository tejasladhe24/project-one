import { eq } from "drizzle-orm"
import type { db as DbType } from "@/db"
import {
  inboxNotification,
  issue,
  issueActivity,
  issueSubscriber,
  team,
} from "@/db/schema"
import { generateUUID } from "@/lib/utils"

type Db = typeof DbType
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
type DbLike = Db | Tx

type ActivityType =
  | "created"
  | "comment"
  | "mention"
  | "status-change"
  | "assignee-change"
  | "due-date-change"
  | "priority-change"
  | "estimated-hours-change"
  | "label-change"
  | "title-change"
  | "description-change"

type SubscriberReason = "creator" | "assignee" | "mentioned" | "manual"

async function issueTitleKey(
  database: DbLike,
  issueId: string
): Promise<{ title: string; key: string; organizationId: string } | null> {
  const [row] = await database
    .select({
      title: issue.title,
      number: issue.number,
      identifier: team.identifier,
      organizationId: team.organizationId,
    })
    .from(issue)
    .innerJoin(team, eq(issue.teamId, team.id))
    .where(eq(issue.id, issueId))
    .limit(1)
  if (!row) return null
  const key = `${row.identifier}-${String(row.number).padStart(4, "0")}`
  return {
    title: `${key} ${row.title}`,
    key,
    organizationId: row.organizationId,
  }
}

export async function subscribeToIssue(
  database: DbLike,
  input: {
    issueId: string
    userId: string
    reason: SubscriberReason
  }
) {
  await database
    .insert(issueSubscriber)
    .values({
      issueId: input.issueId,
      userId: input.userId,
      reason: input.reason,
    })
    .onConflictDoNothing()
}

export async function recordIssueActivity(
  database: DbLike,
  input: {
    issueId: string
    actorId: string
    actorName?: string
    type: ActivityType
    message: string
    comment?: string | null
    oldValue?: string | null
    newValue?: string | null
    /** Notify issue subscribers (except actor). Default true except for `created`. */
    notify?: boolean
    /** Extra recipients (e.g. @mentions), always notified. */
    extraRecipientIds?: string[]
    /** Force priority inbox for these users (mentions / assignments). */
    priorityRecipientIds?: string[]
  }
) {
  const meta = await issueTitleKey(database, input.issueId)
  if (!meta) return null

  const activityId = generateUUID()
  await database.insert(issueActivity).values({
    id: activityId,
    issueId: input.issueId,
    type: input.type,
    userId: input.actorId,
    message: input.message,
    comment: input.comment ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
  })

  const shouldNotify = input.notify ?? input.type !== "created"
  if (!shouldNotify && !input.extraRecipientIds?.length) {
    return activityId
  }

  const subscriberRows = shouldNotify
    ? await database
        .select({ userId: issueSubscriber.userId })
        .from(issueSubscriber)
        .where(eq(issueSubscriber.issueId, input.issueId))
    : []

  const recipientIds = new Set<string>()
  for (const row of subscriberRows) {
    if (row.userId !== input.actorId) recipientIds.add(row.userId)
  }
  for (const id of input.extraRecipientIds ?? []) {
    if (id !== input.actorId) recipientIds.add(id)
  }

  if (recipientIds.size === 0) return activityId

  const prioritySet = new Set(input.priorityRecipientIds ?? [])
  const isHighSignal =
    input.type === "mention" ||
    input.type === "assignee-change" ||
    input.type === "comment"

  await database.insert(inboxNotification).values(
    [...recipientIds].map((userId) => ({
      id: generateUUID(),
      organizationId: meta.organizationId,
      userId,
      type: "issue" as const,
      activityId,
      issueId: input.issueId,
      actorId: input.actorId,
      title: meta.title,
      body: input.message,
      isPriority: prioritySet.has(userId) || isHighSignal,
    }))
  )

  return activityId
}

export async function createReviewInboxNotification(
  database: DbLike,
  input: {
    organizationId: string
    userId: string
    actorId?: string | null
    title: string
    body: string
    isPriority?: boolean
  }
) {
  const id = generateUUID()
  await database.insert(inboxNotification).values({
    id,
    organizationId: input.organizationId,
    userId: input.userId,
    type: "review",
    activityId: null,
    issueId: null,
    actorId: input.actorId ?? null,
    title: input.title,
    body: input.body,
    isPriority: input.isPriority ?? false,
  })
  return id
}
