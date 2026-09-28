import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq, inArray, isNotNull, max, or } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import {
  issue,
  issueStatus,
  issueToLabel,
  label,
  member,
  project,
  relatedIssue,
  team,
  user,
} from "@/db/schema"
import { recordIssueActivity, subscribeToIssue } from "@/lib/issues/activity"
import { priorityLabel } from "@/lib/issues/meta"
import { getCurrentCycleNumber } from "@/lib/cycles/dates"
import { getOptionalOrgSession, requireOrgSession } from "@/lib/server/session"
import { requireTeamIssueAccess } from "@/lib/server/access"
import { listStatuses } from "@/lib/statuses"
import { generateUUID } from "@/lib/utils"

const assignee = alias(user, "issue_assignee")

export const listIssues = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().optional(),
      projectId: z.string().optional(),
      /** When true, only issues assigned to the current user. */
      mine: z.boolean().optional(),
      /** When true, only issues attached to a cycle. */
      inCycle: z.boolean().optional(),
      /** Filter by status category (e.g. triage). */
      statusCategory: z
        .enum([
          "triage",
          "backlog",
          "unstarted",
          "started",
          "completed",
          "canceled",
          "duplicate",
        ])
        .optional(),
      /** Include markdown description (default false for list UIs). */
      includeDescription: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await getOptionalOrgSession()
    if (!organizationId) return []

    const filters = [eq(team.organizationId, organizationId)]
    if (data.teamId) {
      filters.push(eq(issue.teamId, data.teamId))
    }
    if (data.projectId) {
      filters.push(eq(issue.projectId, data.projectId))
    }
    if (data.mine) {
      if (!session?.user.id) return []
      filters.push(eq(issue.assigneeId, session.user.id))
    }
    if (data.inCycle) {
      filters.push(isNotNull(issue.cycleNumber))
    }
    if (data.statusCategory) {
      filters.push(eq(issueStatus.category, data.statusCategory))
    }

    const includeDescription = data.includeDescription === true

    const rows = await db
      .select({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        ...(includeDescription ? { description: issue.description } : {}),
        priority: issue.priority,
        dueDate: issue.dueDate,
        estimatedHours: issue.estimatedHours,
        cycleNumber: issue.cycleNumber,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        projectId: project.id,
        projectName: project.name,
        teamId: team.id,
        teamName: team.name,
        teamIdentifier: team.identifier,
        estimateType: team.estimateType,
        allowZeroEstimates: team.allowZeroEstimates,
        extendedEstimateScale: team.extendedEstimateScale,
        countUnestimatedIssues: team.countUnestimatedIssues,
        cyclesEnabled: team.cyclesEnabled,
        cycleDurationWeeks: team.cycleDurationWeeks,
        cycleStartDay: team.cycleStartDay,
        cyclesOrigin: team.cyclesOrigin,
        statusId: issueStatus.id,
        statusName: issueStatus.name,
        statusCategory: issueStatus.category,
        statusSortOrder: issueStatus.sortOrder,
        statusIsDefault: issueStatus.isDefault,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        assigneeImage: assignee.image,
      })
      .from(issue)
      .innerJoin(team, eq(issue.teamId, team.id))
      .leftJoin(project, eq(issue.projectId, project.id))
      .leftJoin(issueStatus, eq(issue.statusId, issueStatus.id))
      .leftJoin(assignee, eq(issue.assigneeId, assignee.id))
      .where(and(...filters))
      .orderBy(
        asc(issueStatus.sortOrder),
        asc(issue.priority),
        asc(issue.number)
      )

    if (rows.length === 0) return []

    const issueIds = rows.map((row) => row.id)
    const labelRows = await db
      .select({
        issueId: issueToLabel.issueId,
        labelId: label.id,
        labelName: label.name,
      })
      .from(issueToLabel)
      .innerJoin(label, eq(issueToLabel.labelId, label.id))
      .where(inArray(issueToLabel.issueId, issueIds))

    const labelsByIssue = new Map<string, { id: string; name: string }[]>()
    for (const row of labelRows) {
      const list = labelsByIssue.get(row.issueId) ?? []
      list.push({ id: row.labelId, name: row.labelName })
      labelsByIssue.set(row.issueId, list)
    }

    return rows.map((row) => ({
      ...row,
      description:
        includeDescription && "description" in row
          ? (row as { description: string | null }).description
          : null,
      labels: labelsByIssue.get(row.id) ?? [],
    }))
  })

/** Slim issue picker rows (id, number, title, identifier). */
export const listIssueOptions = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await getOptionalOrgSession()
    if (!organizationId) return []

    return db
      .select({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        identifier: team.identifier,
      })
      .from(issue)
      .innerJoin(team, eq(issue.teamId, team.id))
      .where(
        and(
          eq(issue.teamId, data.teamId),
          eq(team.organizationId, organizationId)
        )
      )
      .orderBy(asc(issue.number))
  })

export const listIssueStatuses = listStatuses

export const getIssue = createServerFn({ method: "GET" })
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
        dueDate: issue.dueDate,
        estimatedHours: issue.estimatedHours,
        cycleNumber: issue.cycleNumber,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        teamId: team.id,
        teamName: team.name,
        teamIdentifier: team.identifier,
        cyclesEnabled: team.cyclesEnabled,
        cycleDurationWeeks: team.cycleDurationWeeks,
        cycleStartDay: team.cycleStartDay,
        cyclesOrigin: team.cyclesOrigin,
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

export const createIssue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(2, "Title is required"),
      teamId: z.string().min(1, "Team is required"),
      projectId: z.string().optional(),
      statusId: z.string().optional(),
      priority: z.number().int().min(0).max(4).optional(),
      description: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    const [ownedTeam] = await db
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!ownedTeam) throw new Error("Team not found")

    if (data.projectId) {
      const [ownedProject] = await db
        .select({ id: project.id })
        .from(project)
        .where(
          and(
            eq(project.id, data.projectId),
            eq(project.organizationId, organizationId)
          )
        )
        .limit(1)
      if (!ownedProject) throw new Error("Project not found")
    }

    let statusId = data.statusId
    if (statusId) {
      const [ownedStatus] = await db
        .select({ id: issueStatus.id })
        .from(issueStatus)
        .where(
          and(eq(issueStatus.id, statusId), eq(issueStatus.teamId, data.teamId))
        )
        .limit(1)
      if (!ownedStatus) throw new Error("Status not found")
    } else {
      const [defaultStatus] = await db
        .select({ id: issueStatus.id })
        .from(issueStatus)
        .where(
          and(
            eq(issueStatus.teamId, data.teamId),
            eq(issueStatus.isDefault, true)
          )
        )
        .limit(1)
      if (defaultStatus) {
        statusId = defaultStatus.id
      } else {
        const [fallback] = await db
          .select({ id: issueStatus.id })
          .from(issueStatus)
          .where(eq(issueStatus.teamId, data.teamId))
          .orderBy(asc(issueStatus.sortOrder))
          .limit(1)
        statusId = fallback?.id
      }
    }

    const created = await db.transaction(async (tx) => {
      // Serialize number allocation per team
      await tx
        .select({ id: team.id })
        .from(team)
        .where(eq(team.id, data.teamId))
        .for("update")

      const [maxRow] = await tx
        .select({ maxNumber: max(issue.number) })
        .from(issue)
        .where(eq(issue.teamId, data.teamId))

      const nextNumber = (maxRow?.maxNumber ?? 0) + 1

      const [row] = await tx
        .insert(issue)
        .values({
          id: generateUUID(),
          number: nextNumber,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          projectId: data.projectId || null,
          teamId: data.teamId,
          statusId: statusId ?? null,
          priority: data.priority ?? 0,
          assigneeId: session.user.id,
        })
        .returning()

      if (!row) throw new Error("Failed to create issue")

      await subscribeToIssue(tx, {
        issueId: row.id,
        userId: session.user.id,
        reason: "creator",
      })
      await recordIssueActivity(tx, {
        issueId: row.id,
        actorId: session.user.id,
        type: "created",
        message: `${session.user.name} created the issue`,
        notify: false,
      })

      return row
    })

    return created
  })

function priorityActivityLabel(value: number | null | undefined) {
  return priorityLabel(value)
}

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((id, i) => id === right[i])
}

export const updateIssue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      issueId: z.string().min(1),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(200_000).nullable().optional(),
      priority: z.number().int().min(0).max(4).optional(),
      estimatedHours: z.number().int().min(0).max(1000).nullable().optional(),
      statusId: z.string().min(1).nullable().optional(),
      assigneeId: z.string().min(1).nullable().optional(),
      projectId: z.string().min(1).nullable().optional(),
      labelIds: z.array(z.string().min(1)).optional(),
      /** null = remove from cycle; number = set cycle (current only from UI). */
      cycleNumber: z.number().int().min(1).nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    return db.transaction(async (tx) => {
      const [owned] = await tx
        .select({
          id: issue.id,
          cyclesEnabled: team.cyclesEnabled,
          cycleDurationWeeks: team.cycleDurationWeeks,
          cycleStartDay: team.cycleStartDay,
          cyclesOrigin: team.cyclesOrigin,
        })
        .from(issue)
        .innerJoin(team, eq(issue.teamId, team.id))
        .where(
          and(
            eq(issue.id, data.issueId),
            eq(issue.teamId, data.teamId),
            eq(team.organizationId, organizationId)
          )
        )
        .limit(1)
      if (!owned) throw new Error("Issue not found")

      if (data.cycleNumber !== undefined) {
        if (!owned.cyclesEnabled) {
          throw new Error("Cycles are not enabled for this team")
        }
        if (data.cycleNumber != null) {
          const current = getCurrentCycleNumber({
            cyclesEnabled: owned.cyclesEnabled,
            cycleDurationWeeks: owned.cycleDurationWeeks,
            cycleStartDay: owned.cycleStartDay,
            cyclesOrigin: owned.cyclesOrigin,
          })
          if (current == null || data.cycleNumber !== current) {
            throw new Error("Issues can only be added to the current cycle")
          }
        }
      }

      const assigneeUser = alias(user, "update_assignee")

      const [before] = await tx
        .select({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          estimatedHours: issue.estimatedHours,
          cycleNumber: issue.cycleNumber,
          statusId: issue.statusId,
          statusName: issueStatus.name,
          assigneeId: issue.assigneeId,
          assigneeName: assigneeUser.name,
          projectId: issue.projectId,
          projectName: project.name,
        })
        .from(issue)
        .leftJoin(issueStatus, eq(issue.statusId, issueStatus.id))
        .leftJoin(assigneeUser, eq(issue.assigneeId, assigneeUser.id))
        .leftJoin(project, eq(issue.projectId, project.id))
        .where(eq(issue.id, data.issueId))
        .limit(1)
      if (!before) throw new Error("Issue not found")

      const beforeLabels = await tx
        .select({ id: label.id, name: label.name })
        .from(issueToLabel)
        .innerJoin(label, eq(issueToLabel.labelId, label.id))
        .where(eq(issueToLabel.issueId, data.issueId))
        .orderBy(asc(label.name))

      if (data.statusId) {
        const [ownedStatus] = await tx
          .select({ id: issueStatus.id })
          .from(issueStatus)
          .where(
            and(
              eq(issueStatus.id, data.statusId),
              eq(issueStatus.teamId, data.teamId)
            )
          )
          .limit(1)
        if (!ownedStatus) throw new Error("Status not found")
      }

      if (data.assigneeId) {
        const [memberRow] = await tx
          .select({ id: member.userId, name: user.name })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(
            and(
              eq(member.userId, data.assigneeId),
              eq(member.organizationId, organizationId)
            )
          )
          .limit(1)
        if (!memberRow) throw new Error("Assignee not found")
      }

      if (data.projectId) {
        const [ownedProject] = await tx
          .select({ id: project.id })
          .from(project)
          .where(
            and(
              eq(project.id, data.projectId),
              eq(project.organizationId, organizationId)
            )
          )
          .limit(1)
        if (!ownedProject) throw new Error("Project not found")
      }

      if (data.labelIds !== undefined && data.labelIds.length > 0) {
        const found = await tx
          .select({ id: label.id })
          .from(label)
          .where(
            and(
              inArray(label.id, data.labelIds),
              eq(label.organizationId, organizationId)
            )
          )
        if (found.length !== data.labelIds.length) {
          throw new Error("One or more labels not found")
        }
      }

      const patch: {
        title?: string
        description?: string | null
        priority?: number
        estimatedHours?: number | null
        statusId?: string | null
        assigneeId?: string | null
        projectId?: string | null
        cycleNumber?: number | null
      } = {}
      if (data.title !== undefined) patch.title = data.title.trim()
      if (data.description !== undefined) {
        patch.description = data.description?.trim() || null
      }
      if (data.priority !== undefined) patch.priority = data.priority
      if (data.estimatedHours !== undefined) {
        patch.estimatedHours = data.estimatedHours
      }
      if (data.statusId !== undefined) patch.statusId = data.statusId
      if (data.assigneeId !== undefined) patch.assigneeId = data.assigneeId
      if (data.projectId !== undefined) patch.projectId = data.projectId
      if (data.cycleNumber !== undefined) patch.cycleNumber = data.cycleNumber

      if (Object.keys(patch).length > 0) {
        await tx.update(issue).set(patch).where(eq(issue.id, data.issueId))
      }

      let nextLabels = beforeLabels
      if (data.labelIds !== undefined) {
        await tx
          .delete(issueToLabel)
          .where(eq(issueToLabel.issueId, data.issueId))
        if (data.labelIds.length > 0) {
          await tx.insert(issueToLabel).values(
            data.labelIds.map((labelId) => ({
              issueId: data.issueId,
              labelId,
            }))
          )
        }
        nextLabels = await tx
          .select({ id: label.id, name: label.name })
          .from(issueToLabel)
          .innerJoin(label, eq(issueToLabel.labelId, label.id))
          .where(eq(issueToLabel.issueId, data.issueId))
          .orderBy(asc(label.name))

        if (
          !sameIdSet(
            beforeLabels.map((l) => l.id),
            data.labelIds
          )
        ) {
          const names = nextLabels.map((l) => l.name)
          await recordIssueActivity(tx, {
            issueId: data.issueId,
            actorId: session.user.id,
            type: "label-change",
            message:
              names.length > 0
                ? `${session.user.name} updated labels to ${names.join(", ")}`
                : `${session.user.name} cleared labels`,
            oldValue: beforeLabels.map((l) => l.name).join(", ") || null,
            newValue: names.join(", ") || null,
            notify: true,
          })
        }
      }

      const actorName = session.user.name

      if (data.statusId !== undefined && data.statusId !== before.statusId) {
        const [nextStatus] = data.statusId
          ? await tx
              .select({ name: issueStatus.name })
              .from(issueStatus)
              .where(eq(issueStatus.id, data.statusId))
              .limit(1)
          : [null]
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "status-change",
          message: nextStatus?.name
            ? `${actorName} changed status to ${nextStatus.name}`
            : `${actorName} cleared the status`,
          oldValue: before.statusName,
          newValue: nextStatus?.name ?? null,
          notify: true,
        })
      }

      if (
        data.priority !== undefined &&
        data.priority !== (before.priority ?? 0)
      ) {
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "priority-change",
          message: `${actorName} set priority to ${priorityActivityLabel(data.priority)}`,
          oldValue: priorityActivityLabel(before.priority),
          newValue: priorityActivityLabel(data.priority),
          notify: true,
        })
      }

      if (
        data.estimatedHours !== undefined &&
        data.estimatedHours !== before.estimatedHours
      ) {
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "estimated-hours-change",
          message:
            data.estimatedHours == null
              ? `${actorName} cleared the estimate`
              : `${actorName} set estimate to ${data.estimatedHours}`,
          oldValue:
            before.estimatedHours != null
              ? String(before.estimatedHours)
              : null,
          newValue:
            data.estimatedHours != null ? String(data.estimatedHours) : null,
          notify: true,
        })
      }

      if (
        data.assigneeId !== undefined &&
        data.assigneeId !== before.assigneeId
      ) {
        let nextName: string | null = null
        if (data.assigneeId) {
          const [u] = await tx
            .select({ name: user.name })
            .from(user)
            .where(eq(user.id, data.assigneeId))
            .limit(1)
          nextName = u?.name ?? null
          await subscribeToIssue(tx, {
            issueId: data.issueId,
            userId: data.assigneeId,
            reason: "assignee",
          })
        }
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "assignee-change",
          message: nextName
            ? `${actorName} assigned to ${nextName}`
            : `${actorName} removed the assignee`,
          oldValue: before.assigneeName,
          newValue: nextName,
          notify: true,
          priorityRecipientIds: data.assigneeId ? [data.assigneeId] : [],
          extraRecipientIds: data.assigneeId ? [data.assigneeId] : [],
        })
      }

      if (data.projectId !== undefined && data.projectId !== before.projectId) {
        let nextName: string | null = null
        if (data.projectId) {
          const [p] = await tx
            .select({ name: project.name })
            .from(project)
            .where(eq(project.id, data.projectId))
            .limit(1)
          nextName = p?.name ?? null
        }
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "status-change",
          message: nextName
            ? `${actorName} moved to project ${nextName}`
            : `${actorName} removed the project`,
          oldValue: before.projectName,
          newValue: nextName,
          notify: true,
        })
      }

      if (
        data.description !== undefined &&
        (data.description?.trim() || null) !== (before.description ?? null)
      ) {
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "description-change",
          message: `${actorName} updated the description`,
          notify: true,
        })
      }

      if (data.title !== undefined && data.title.trim() !== before.title) {
        await recordIssueActivity(tx, {
          issueId: data.issueId,
          actorId: session.user.id,
          type: "title-change",
          message: `${actorName} renamed the issue`,
          oldValue: before.title,
          newValue: data.title.trim(),
          notify: true,
        })
      }

      const afterAssignee = alias(user, "after_assignee")
      const [after] = await tx
        .select({
          id: issue.id,
          teamId: issue.teamId,
          priority: issue.priority,
          estimatedHours: issue.estimatedHours,
          cycleNumber: issue.cycleNumber,
          statusId: issue.statusId,
          statusName: issueStatus.name,
          statusCategory: issueStatus.category,
          statusSortOrder: issueStatus.sortOrder,
          assigneeId: issue.assigneeId,
          assigneeName: afterAssignee.name,
          assigneeImage: afterAssignee.image,
          projectId: issue.projectId,
          projectName: project.name,
        })
        .from(issue)
        .leftJoin(issueStatus, eq(issue.statusId, issueStatus.id))
        .leftJoin(afterAssignee, eq(issue.assigneeId, afterAssignee.id))
        .leftJoin(project, eq(issue.projectId, project.id))
        .where(eq(issue.id, data.issueId))
        .limit(1)

      if (!after) throw new Error("Issue not found")

      return {
        id: after.id,
        teamId: after.teamId,
        statusId: after.statusId,
        statusName: after.statusName,
        statusCategory: after.statusCategory,
        statusSortOrder: after.statusSortOrder,
        priority: after.priority,
        estimatedHours: after.estimatedHours,
        cycleNumber: after.cycleNumber,
        assigneeId: after.assigneeId,
        assigneeName: after.assigneeName,
        assigneeImage: after.assigneeImage,
        projectId: after.projectId,
        projectName: after.projectName,
        labels: nextLabels,
      }
    })
  })

export const deleteIssue = createServerFn({ method: "POST" })
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

    await db.transaction(async (tx) => {
      // related_issue has no ON DELETE cascade
      await tx
        .delete(relatedIssue)
        .where(
          or(
            eq(relatedIssue.issueId, data.issueId),
            eq(relatedIssue.relatedIssueId, data.issueId)
          )
        )

      const deleted = await tx
        .delete(issue)
        .where(
          and(eq(issue.id, data.issueId), eq(issue.teamId, data.teamId))
        )
        .returning({ id: issue.id })

      if (deleted.length === 0) throw new Error("Issue not found")
    })

    return { ok: true as const, issueId: data.issueId }
  })
