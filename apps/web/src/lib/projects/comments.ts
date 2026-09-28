import { createServerFn } from "@tanstack/react-start"
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import {
  issue,
  issueStatus,
  member,
  projectActivity,
  projectComment,
  projectCommentMention,
  team,
  user,
} from "@/db/schema"
import {
  formatIssueMention,
  formatUserMention,
  parseMentionsFromBody,
} from "@/lib/issues/comments"
import { requireProjectInOrg } from "@/lib/server/access"
import { requireOrgSession } from "@/lib/server/session"
import { generateUUID } from "@/lib/utils"

const author = alias(user, "project_comment_author")
const actor = alias(user, "project_activity_actor")

export { formatIssueMention, formatUserMention, parseMentionsFromBody }

export const listProjectComments = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    return db
      .select({
        id: projectComment.id,
        projectId: projectComment.projectId,
        parentId: projectComment.parentId,
        body: projectComment.body,
        createdAt: projectComment.createdAt,
        updatedAt: projectComment.updatedAt,
        authorId: author.id,
        authorName: author.name,
        authorImage: author.image,
      })
      .from(projectComment)
      .innerJoin(author, eq(projectComment.authorId, author.id))
      .where(eq(projectComment.projectId, data.projectId))
      .orderBy(asc(projectComment.createdAt))
  })

export const listProjectCommentMentionOptions = createServerFn({
  method: "GET",
})
  .validator(
    z.object({
      projectId: z.string().min(1),
      query: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    const q = data.query?.trim() ?? ""
    const like = q ? `%${q}%` : null

    const users = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, organizationId),
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
          eq(issue.projectId, data.projectId),
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

export const createProjectComment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      body: z.string().min(1).max(10_000),
      parentId: z.string().min(1).nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    const body = data.body.trim()
    if (!body) throw new Error("Comment cannot be empty")

    if (data.parentId) {
      const [parent] = await db
        .select({
          id: projectComment.id,
          projectId: projectComment.projectId,
          parentId: projectComment.parentId,
        })
        .from(projectComment)
        .where(
          and(
            eq(projectComment.id, data.parentId),
            eq(projectComment.projectId, data.projectId)
          )
        )
        .limit(1)
      if (!parent) throw new Error("Parent comment not found")
      if (parent.parentId) {
        throw new Error("Cannot reply to a reply")
      }
    }

    const mentions = parseMentionsFromBody(body)
    if (mentions.users.length > 0) {
      const memberIds = new Set(
        (
          await db
            .select({ userId: member.userId })
            .from(member)
            .where(eq(member.organizationId, organizationId))
        ).map((m) => m.userId)
      )
      for (const m of mentions.users) {
        if (!memberIds.has(m.userId)) {
          throw new Error("Mentioned user is not in this organization")
        }
      }
    }
    if (mentions.issues.length > 0) {
      const mentionedIds = mentions.issues.map((m) => m.issueId)
      const found = await db
        .select({ id: issue.id })
        .from(issue)
        .where(
          and(
            eq(issue.projectId, data.projectId),
            inArray(issue.id, mentionedIds)
          )
        )
      const foundIds = new Set(found.map((f) => f.id))
      for (const m of mentions.issues) {
        if (!foundIds.has(m.issueId)) {
          throw new Error("Mentioned issue not found on this project")
        }
      }
    }

    const commentId = generateUUID()
    const [row] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(projectComment)
        .values({
          id: commentId,
          projectId: data.projectId,
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
        await tx.insert(projectCommentMention).values(mentionRows)
      }

      return [created]
    })

    return {
      id: row!.id,
      projectId: row!.projectId,
      parentId: row!.parentId,
      body: row!.body,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
      authorId: session.user.id,
      authorName: session.user.name,
      authorImage: session.user.image ?? null,
    }
  })

export const deleteProjectComment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      commentId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    const [comment] = await db
      .select({ id: projectComment.id, authorId: projectComment.authorId })
      .from(projectComment)
      .where(
        and(
          eq(projectComment.id, data.commentId),
          eq(projectComment.projectId, data.projectId)
        )
      )
      .limit(1)
    if (!comment) throw new Error("Comment not found")
    if (comment.authorId !== session.user.id) {
      throw new Error("You can only delete your own comments")
    }

    await db.delete(projectComment).where(eq(projectComment.id, data.commentId))
    return { ok: true as const }
  })

/** Comments + non-comment activity events for the project activity page. */
export const getProjectTimeline = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    // Idempotent: move flat activity comments (pre-project_comment) into the
    // comment table. Safe when drizzle push applied schema without SQL migrate.
    await db.execute(sql`
      INSERT INTO project_comment (id, project_id, parent_id, author_id, body, created_at, updated_at)
      SELECT id, project_id, NULL, user_id, message, created_at, created_at
      FROM project_activity
      WHERE type = 'comment'
        AND user_id IS NOT NULL
        AND project_id = ${data.projectId}
      ON CONFLICT (id) DO NOTHING
    `)
    await db.execute(sql`
      DELETE FROM project_activity
      WHERE type = 'comment' AND project_id = ${data.projectId}
    `)

    const [comments, activities] = await Promise.all([
      db
        .select({
          id: projectComment.id,
          projectId: projectComment.projectId,
          parentId: projectComment.parentId,
          body: projectComment.body,
          createdAt: projectComment.createdAt,
          updatedAt: projectComment.updatedAt,
          authorId: author.id,
          authorName: author.name,
          authorImage: author.image,
        })
        .from(projectComment)
        .innerJoin(author, eq(projectComment.authorId, author.id))
        .where(eq(projectComment.projectId, data.projectId))
        .orderBy(asc(projectComment.createdAt)),
      db
        .select({
          id: projectActivity.id,
          projectId: projectActivity.projectId,
          type: projectActivity.type,
          message: projectActivity.message,
          createdAt: projectActivity.createdAt,
          actorId: actor.id,
          actorName: actor.name,
          actorImage: actor.image,
        })
        .from(projectActivity)
        .leftJoin(actor, eq(projectActivity.userId, actor.id))
        .where(
          and(
            eq(projectActivity.projectId, data.projectId),
            sql`${projectActivity.type} <> 'comment'`
          )
        )
        .orderBy(asc(projectActivity.createdAt)),
    ])

    return { comments, activities }
  })
