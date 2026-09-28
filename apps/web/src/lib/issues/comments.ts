import { createServerFn } from "@tanstack/react-start"
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import {
  issue,
  issueComment,
  issueCommentMention,
  issueStatus,
  team,
  teamMember,
  user,
} from "@/db/schema"
import {
  recordIssueActivity,
  subscribeToIssue,
} from "@/lib/issues/activity"
import { requireTeamIssueAccess } from "@/lib/server/access"
import { requireOrgSession } from "@/lib/server/session"
import { generateUUID } from "@/lib/utils"

const author = alias(user, "comment_author")

/** Mentions encoded in body as @[Label](user:id) or @[Label](issue:id). */
const MENTION_RE = /@\[([^\]]+)\]\((user|issue):([^)]+)\)/g

export function parseMentionsFromBody(body: string) {
  const users: { userId: string; label: string }[] = []
  const issues: { issueId: string; label: string }[] = []
  for (const match of body.matchAll(MENTION_RE)) {
    const label = match[1]!
    const type = match[2]!
    const id = match[3]!
    if (type === "user") users.push({ userId: id, label })
    else issues.push({ issueId: id, label })
  }
  return { users, issues }
}

export function formatUserMention(name: string, userId: string) {
  return `@[${name}](user:${userId})`
}

export function formatIssueMention(
  label: string,
  issueId: string
) {
  return `@[${label}](issue:${issueId})`
}

export const listIssueComments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    const rows = await db
      .select({
        id: issueComment.id,
        issueId: issueComment.issueId,
        parentId: issueComment.parentId,
        body: issueComment.body,
        createdAt: issueComment.createdAt,
        updatedAt: issueComment.updatedAt,
        authorId: author.id,
        authorName: author.name,
        authorImage: author.image,
      })
      .from(issueComment)
      .innerJoin(author, eq(issueComment.authorId, author.id))
      .where(eq(issueComment.issueId, data.issueId))
      .orderBy(asc(issueComment.createdAt))

    return rows
  })

export const listCommentMentionOptions = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      query: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    const [owned] = await db
      .select({ id: team.id, identifier: team.identifier })
      .from(team)
      .innerJoin(
        teamMember,
        and(
          eq(teamMember.teamId, team.id),
          eq(teamMember.userId, session.user.id)
        )
      )
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Team not found")

    const q = data.query?.trim() ?? ""
    const like = q ? `%${q}%` : null

    const users = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(teamMember)
      .innerJoin(user, eq(teamMember.userId, user.id))
      .where(
        and(
          eq(teamMember.teamId, data.teamId),
          like ? or(ilike(user.name, like), ilike(user.email, like)) : undefined
        )
      )
      .orderBy(asc(user.name))
      .limit(4)

    const issues = await db
      .select({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        statusName: issueStatus.name,
        statusCategory: issueStatus.category,
        teamIdentifier: team.identifier,
      })
      .from(issue)
      .innerJoin(team, eq(issue.teamId, team.id))
      .leftJoin(issueStatus, eq(issue.statusId, issueStatus.id))
      .where(
        and(
          eq(issue.teamId, data.teamId),
          like
            ? or(
                ilike(issue.title, like),
                sql`CAST(${issue.number} AS TEXT) ILIKE ${like}`,
                ilike(team.identifier, like)
              )
            : undefined
        )
      )
      .orderBy(desc(issue.updatedAt))
      .limit(4)

    return {
      users,
      issues: issues.map((i) => ({
        ...i,
        label: `${i.teamIdentifier}-${String(i.number).padStart(4, "0")} ${i.title}`,
      })),
    }
  })

export const createIssueComment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
      body: z.string().min(1).max(10_000),
      parentId: z.string().min(1).nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    const body = data.body.trim()
    if (!body) throw new Error("Comment cannot be empty")

    if (data.parentId) {
      const [parent] = await db
        .select({
          id: issueComment.id,
          issueId: issueComment.issueId,
          parentId: issueComment.parentId,
        })
        .from(issueComment)
        .where(
          and(
            eq(issueComment.id, data.parentId),
            eq(issueComment.issueId, data.issueId)
          )
        )
        .limit(1)
      if (!parent) throw new Error("Parent comment not found")
      // Only allow one level of nesting (reply to a root comment).
      if (parent.parentId) {
        throw new Error("Cannot reply to a reply")
      }
    }

    const mentions = parseMentionsFromBody(body)
    if (mentions.users.length > 0) {
      const memberIds = new Set(
        (
          await db
            .select({ userId: teamMember.userId })
            .from(teamMember)
            .where(eq(teamMember.teamId, data.teamId))
        ).map((m) => m.userId)
      )
      for (const m of mentions.users) {
        if (!memberIds.has(m.userId)) {
          throw new Error("Mentioned user is not on this team")
        }
      }
    }
    if (mentions.issues.length > 0) {
      const mentionedIds = mentions.issues.map((m) => m.issueId)
      const found = await db
        .select({ id: issue.id })
        .from(issue)
        .where(
          and(eq(issue.teamId, data.teamId), inArray(issue.id, mentionedIds))
        )
      const foundIds = new Set(found.map((f) => f.id))
      for (const m of mentions.issues) {
        if (!foundIds.has(m.issueId)) {
          throw new Error("Mentioned issue not found on this team")
        }
      }
    }

    const commentId = generateUUID()
    const [row] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(issueComment)
        .values({
          id: commentId,
          issueId: data.issueId,
          parentId: data.parentId || null,
          authorId: session.user.id,
          body,
        })
        .returning()

      const mentionRows = [
        ...mentions.users.map((m) => ({
          id: generateUUID(),
          commentId,
          type: "user" as const,
          userId: m.userId,
          mentionedIssueId: null,
        })),
        ...mentions.issues.map((m) => ({
          id: generateUUID(),
          commentId,
          type: "issue" as const,
          userId: null,
          mentionedIssueId: m.issueId,
        })),
      ]
      if (mentionRows.length > 0) {
        await tx.insert(issueCommentMention).values(mentionRows)
      }

      const mentionedUserIds = mentions.users.map((m) => m.userId)
      for (const userId of mentionedUserIds) {
        await subscribeToIssue(tx, {
          issueId: data.issueId,
          userId,
          reason: "mentioned",
        })
      }

      await recordIssueActivity(tx, {
        issueId: data.issueId,
        actorId: session.user.id,
        type: "comment",
        message: data.parentId
          ? `${session.user.name} replied to a comment`
          : `${session.user.name} commented`,
        comment: body,
        notify: true,
      })

      if (mentionedUserIds.length > 0) {
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "mention",
          message: `${session.user.name} mentioned you in a comment`,
          comment: body,
          notify: false,
          extraRecipientIds: mentionedUserIds,
          priorityRecipientIds: mentionedUserIds,
        })
      }

      return [created]
    })

    return row
  })

export const deleteIssueComment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
      commentId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamIssueAccess(
      data.teamId,
      data.issueId,
      organizationId,
      session.user.id
    )

    const [comment] = await db
      .select({ id: issueComment.id, authorId: issueComment.authorId })
      .from(issueComment)
      .where(
        and(
          eq(issueComment.id, data.commentId),
          eq(issueComment.issueId, data.issueId)
        )
      )
      .limit(1)
    if (!comment) throw new Error("Comment not found")
    if (comment.authorId !== session.user.id) {
      throw new Error("You can only delete your own comments")
    }

    await db.delete(issueComment).where(eq(issueComment.id, data.commentId))
    return { ok: true as const }
  })
