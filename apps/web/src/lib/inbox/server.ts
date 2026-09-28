import { createServerFn } from "@tanstack/react-start"
import { and, asc, desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import {
  inboxNotification,
  issue,
  issueStatus,
  issueToLabel,
  label,
  project,
  team,
  teamMember,
  user,
} from "@/db/schema"
import { requireOrgSession } from "@/lib/server/session"

const actor = alias(user, "inbox_actor")
const assignee = alias(user, "inbox_issue_assignee")
const requesterMembership = alias(teamMember, "inbox_requester_membership")

export const listInboxNotifications = createServerFn({ method: "GET" }).handler(
  async () => {
    const { session, organizationId } = await requireOrgSession()

    const rows = await db
      .select({
        id: inboxNotification.id,
        type: inboxNotification.type,
        title: inboxNotification.title,
        body: inboxNotification.body,
        isPriority: inboxNotification.isPriority,
        readAt: inboxNotification.readAt,
        createdAt: inboxNotification.createdAt,
        issueId: inboxNotification.issueId,
        teamId: inboxNotification.teamId,
        teamName: team.name,
        teamIdentifier: team.identifier,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorImage: actor.image,
        requesterMembershipId: requesterMembership.id,
      })
      .from(inboxNotification)
      .leftJoin(actor, eq(inboxNotification.actorId, actor.id))
      .leftJoin(team, eq(inboxNotification.teamId, team.id))
      .leftJoin(
        requesterMembership,
        and(
          eq(requesterMembership.teamId, inboxNotification.teamId),
          eq(requesterMembership.userId, inboxNotification.actorId)
        )
      )
      .where(
        and(
          eq(inboxNotification.organizationId, organizationId),
          eq(inboxNotification.userId, session.user.id)
        )
      )
      .orderBy(desc(inboxNotification.createdAt))

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      isPriority: row.isPriority,
      readAt: row.readAt,
      createdAt: row.createdAt,
      issueId: row.issueId,
      teamId: row.teamId,
      teamName: row.teamName,
      teamIdentifier: row.teamIdentifier,
      actorId: row.actorId,
      actorName: row.actorName,
      actorEmail: row.actorEmail,
      actorImage: row.actorImage,
      requesterIsMember: row.requesterMembershipId != null,
    }))
  }
)

export const markInboxNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await db
      .update(inboxNotification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(inboxNotification.id, data.id),
          eq(inboxNotification.userId, session.user.id),
          eq(inboxNotification.organizationId, organizationId)
        )
      )
    return { ok: true as const }
  })

export const markInboxNotificationUnread = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await db
      .update(inboxNotification)
      .set({ readAt: null })
      .where(
        and(
          eq(inboxNotification.id, data.id),
          eq(inboxNotification.userId, session.user.id),
          eq(inboxNotification.organizationId, organizationId)
        )
      )
    return { ok: true as const }
  })

export const deleteInboxNotification = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await db
      .delete(inboxNotification)
      .where(
        and(
          eq(inboxNotification.id, data.id),
          eq(inboxNotification.userId, session.user.id),
          eq(inboxNotification.organizationId, organizationId)
        )
      )
    return { ok: true as const }
  })

export const getInboxIssueDetail = createServerFn({ method: "GET" })
  .validator(z.object({ issueId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [row] = await db
      .select({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        teamId: team.id,
        teamName: team.name,
        teamIdentifier: team.identifier,
        projectId: project.id,
        projectName: project.name,
        statusId: issueStatus.id,
        statusName: issueStatus.name,
        statusCategory: issueStatus.category,
        statusSortOrder: issueStatus.sortOrder,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        assigneeImage: assignee.image,
      })
      .from(issue)
      .innerJoin(team, eq(issue.teamId, team.id))
      .leftJoin(project, eq(issue.projectId, project.id))
      .leftJoin(issueStatus, eq(issue.statusId, issueStatus.id))
      .leftJoin(assignee, eq(issue.assigneeId, assignee.id))
      .where(
        and(eq(issue.id, data.issueId), eq(team.organizationId, organizationId))
      )
      .limit(1)

    if (!row) throw new Error("Issue not found")

    const labelRows = await db
      .select({
        id: label.id,
        name: label.name,
      })
      .from(issueToLabel)
      .innerJoin(label, eq(issueToLabel.labelId, label.id))
      .where(eq(issueToLabel.issueId, data.issueId))
      .orderBy(asc(label.name))

    return { ...row, labels: labelRows }
  })
