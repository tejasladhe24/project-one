import { createServerFn } from "@tanstack/react-start"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import {
  label,
  member,
  project,
  projectActivity,
  projectMember,
  projectTeam,
  projectToLabel,
  team,
  user,
} from "@/db/schema"
import { priorityLabel } from "@/lib/shared/priority"
import { recordProjectActivity } from "@/lib/projects/activity"
import {
  formatProjectShortDate,
  suggestedProjectPeriod,
} from "@/lib/projects/dates"
import { requireProjectInOrg } from "@/lib/server/access"
import { getOptionalOrgSession, requireOrgSession } from "@/lib/server/session"
import { generateUUID } from "@/lib/utils"

const leadUser = alias(user, "lead_user")

export const PROJECT_STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
] as const

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number]["value"]

export function projectStatusLabel(status: string | null | undefined) {
  return (
    PROJECT_STATUSES.find((s) => s.value === status)?.label ??
    projectStatusLabelFromProgress(0)
  )
}

function projectStatusLabelFromProgress(progress: number) {
  if (progress >= 100) return "Completed"
  if (progress > 0) return "In Progress"
  return "Backlog"
}

export function projectStatusDotClass(status: string | null | undefined) {
  switch (status) {
    case "completed":
      return "bg-violet-500"
    case "in_progress":
      return "bg-yellow-500"
    case "planned":
      return "bg-sky-500"
    case "canceled":
      return "bg-muted-foreground/50"
    case "backlog":
    default:
      return "bg-muted-foreground/50"
  }
}

export const listProjects = createServerFn({ method: "GET" }).handler(
  async () => {
    const { organizationId } = await getOptionalOrgSession()
    if (!organizationId) return []

    return db
      .select({
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        leadId: project.lead,
        leadName: leadUser.name,
        leadImage: leadUser.image,
        startDate: project.startDate,
        targetDate: project.targetDate,
        issuesCount: project.issuesCount,
        progress: project.progress,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .leftJoin(leadUser, eq(project.lead, leadUser.id))
      .where(eq(project.organizationId, organizationId))
      .orderBy(project.createdAt)
  }
)

/** Slim project picker rows. */
export const listProjectOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { organizationId } = await getOptionalOrgSession()
    if (!organizationId) return []

    return db
      .select({
        id: project.id,
        name: project.name,
      })
      .from(project)
      .where(eq(project.organizationId, organizationId))
      .orderBy(asc(project.name))
  }
)

/** Projects linked to a team via project_team. */
export const listTeamProjects = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [teamRow] = await db
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!teamRow) return []

    return db
      .select({
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        leadId: project.lead,
        leadName: leadUser.name,
        leadImage: leadUser.image,
        startDate: project.startDate,
        targetDate: project.targetDate,
        issuesCount: project.issuesCount,
        progress: project.progress,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(projectTeam)
      .innerJoin(project, eq(projectTeam.projectId, project.id))
      .leftJoin(leadUser, eq(project.lead, leadUser.id))
      .where(
        and(
          eq(projectTeam.teamId, data.teamId),
          eq(project.organizationId, organizationId)
        )
      )
      .orderBy(project.createdAt)
  })

export const getProject = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [row] = await db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        leadId: project.lead,
        leadName: leadUser.name,
        leadImage: leadUser.image,
        startDate: project.startDate,
        targetDate: project.targetDate,
        issuesCount: project.issuesCount,
        progress: project.progress,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .leftJoin(leadUser, eq(project.lead, leadUser.id))
      .where(
        and(
          eq(project.id, data.projectId),
          eq(project.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!row) throw new Error("Project not found")

    // Ensure the lead is always a project member (backfill older projects).
    if (row.leadId) {
      await db
        .insert(projectMember)
        .values({
          projectId: data.projectId,
          userId: row.leadId,
        })
        .onConflictDoNothing()
    }

    const [members, teams, labels] = await Promise.all([
      db
        .select({
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(projectMember)
        .innerJoin(user, eq(projectMember.userId, user.id))
        .where(eq(projectMember.projectId, data.projectId))
        .orderBy(asc(user.name)),
      db
        .select({
          teamId: team.id,
          name: team.name,
          identifier: team.identifier,
        })
        .from(projectTeam)
        .innerJoin(team, eq(projectTeam.teamId, team.id))
        .where(eq(projectTeam.projectId, data.projectId))
        .orderBy(asc(team.name)),
      db
        .select({
          id: label.id,
          name: label.name,
        })
        .from(projectToLabel)
        .innerJoin(label, eq(projectToLabel.labelId, label.id))
        .where(eq(projectToLabel.projectId, data.projectId))
        .orderBy(asc(label.name)),
    ])

    // Guarantee lead appears in the members list even if join raced.
    let memberRows = members
    if (row.leadId && !memberRows.some((m) => m.userId === row.leadId)) {
      const [leadRow] = await db
        .select({
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, row.leadId))
        .limit(1)
      if (leadRow) {
        memberRows = [...memberRows, leadRow].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      }
    }

    return { ...row, members: memberRows, teams, labels }
  })

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

function dateKey(value: Date | string | null | undefined) {
  if (value == null || value === "") return null
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export const updateProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      description: z.string().max(50_000).nullable().optional(),
      name: z.string().min(2).optional(),
      status: z
        .enum(["backlog", "planned", "in_progress", "completed", "canceled"])
        .optional(),
      priority: z.number().int().min(0).max(4).optional(),
      leadId: z.string().min(1).nullable().optional(),
      startDate: z.string().nullable().optional(),
      targetDate: z.string().optional(),
      memberIds: z.array(z.string().min(1)).optional(),
      teamIds: z.array(z.string().min(1)).optional(),
      labelIds: z.array(z.string().min(1)).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)
    const actorName = session.user.name
    const actorId = session.user.id

    const [before] = await db
      .select({
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        lead: project.lead,
        startDate: project.startDate,
        targetDate: project.targetDate,
      })
      .from(project)
      .where(eq(project.id, data.projectId))
      .limit(1)
    if (!before) throw new Error("Project not found")

    const [beforeLead] = before.lead
      ? await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, before.lead))
          .limit(1)
      : [null]

    const beforeMembers = await db
      .select({ userId: projectMember.userId, name: user.name })
      .from(projectMember)
      .innerJoin(user, eq(projectMember.userId, user.id))
      .where(eq(projectMember.projectId, data.projectId))

    const beforeTeams = await db
      .select({
        teamId: projectTeam.teamId,
        name: team.name,
        identifier: team.identifier,
      })
      .from(projectTeam)
      .innerJoin(team, eq(projectTeam.teamId, team.id))
      .where(eq(projectTeam.projectId, data.projectId))

    const beforeLabels = await db
      .select({ id: projectToLabel.labelId, name: label.name })
      .from(projectToLabel)
      .innerJoin(label, eq(projectToLabel.labelId, label.id))
      .where(eq(projectToLabel.projectId, data.projectId))

    const patch: {
      description?: string | null
      name?: string
      status?: string
      priority?: number
      lead?: string | null
      startDate?: Date | null
      targetDate?: Date
      progress?: number
      updatedAt?: Date
    } = {}

    if (data.description !== undefined) {
      patch.description = data.description?.trim() || null
    }
    if (data.name !== undefined) patch.name = data.name.trim()
    if (data.status !== undefined) {
      patch.status = data.status
      if (data.status === "completed") patch.progress = 100
      else if (data.status === "in_progress") patch.progress = Math.max(1, 50)
      else if (data.status === "backlog" || data.status === "planned") {
        patch.progress = 0
      }
    }
    if (data.priority !== undefined) patch.priority = data.priority
    if (data.leadId !== undefined) patch.lead = data.leadId
    if (data.startDate !== undefined) {
      if (data.startDate === null || data.startDate === "") {
        patch.startDate = null
      } else {
        const d = new Date(data.startDate)
        if (Number.isNaN(d.getTime())) throw new Error("Invalid start date")
        patch.startDate = d
      }
    }
    if (data.targetDate !== undefined) {
      const d = new Date(data.targetDate)
      if (Number.isNaN(d.getTime())) throw new Error("Invalid target date")
      patch.targetDate = d
    }

    const activityRows: {
      type: Parameters<typeof recordProjectActivity>[1]["type"]
      message: string
    }[] = []

    if (data.name !== undefined && data.name.trim() !== before.name) {
      activityRows.push({
        type: "name-change",
        message: `${actorName} renamed the project to ${data.name.trim()}`,
      })
    }

    if (data.description !== undefined) {
      const nextDesc = data.description?.trim() || null
      if (nextDesc !== (before.description ?? null)) {
        activityRows.push({
          type: "description-change",
          message: `${actorName} updated the description`,
        })
      }
    }

    if (data.status !== undefined && data.status !== before.status) {
      activityRows.push({
        type: "status-change",
        message: `${actorName} changed status to ${projectStatusLabel(data.status)}`,
      })
    }

    if (
      data.priority !== undefined &&
      data.priority !== (before.priority ?? 0)
    ) {
      activityRows.push({
        type: "priority-change",
        message: `${actorName} set priority to ${priorityLabel(data.priority)}`,
      })
    }

    if (data.leadId !== undefined && data.leadId !== before.lead) {
      if (data.leadId) {
        const [nextLead] = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, data.leadId))
          .limit(1)
        activityRows.push({
          type: "lead-change",
          message: nextLead
            ? `${actorName} set lead to ${nextLead.name}`
            : `${actorName} updated the lead`,
        })
      } else {
        activityRows.push({
          type: "lead-change",
          message: beforeLead?.name
            ? `${actorName} removed ${beforeLead.name} as lead`
            : `${actorName} cleared the lead`,
        })
      }
    }

    if (data.startDate !== undefined || data.targetDate !== undefined) {
      const nextStart =
        data.startDate !== undefined
          ? data.startDate === null || data.startDate === ""
            ? null
            : data.startDate
          : before.startDate
      const nextTarget =
        data.targetDate !== undefined ? data.targetDate : before.targetDate
      if (
        dateKey(nextStart) !== dateKey(before.startDate) ||
        dateKey(nextTarget) !== dateKey(before.targetDate)
      ) {
        const startLabel = formatProjectShortDate(nextStart)
        const targetLabel = formatProjectShortDate(nextTarget)
        activityRows.push({
          type: "date-change",
          message:
            nextStart == null
              ? `${actorName} updated the target date to ${targetLabel}`
              : `${actorName} updated dates to ${startLabel} → ${targetLabel}`,
        })
      }
    }

    // Lead is always a project member.
    if (data.leadId) {
      const [orgMember] = await db
        .select({ userId: member.userId })
        .from(member)
        .where(
          and(
            eq(member.organizationId, organizationId),
            eq(member.userId, data.leadId)
          )
        )
        .limit(1)
      if (orgMember) {
        await db
          .insert(projectMember)
          .values({
            projectId: data.projectId,
            userId: data.leadId,
          })
          .onConflictDoNothing()
      }
    }

    if (data.memberIds !== undefined) {
      const orgMembers = await db
        .select({ userId: member.userId })
        .from(member)
        .where(eq(member.organizationId, organizationId))
      const allowed = new Set(orgMembers.map((m) => m.userId))
      const nextIds = new Set(data.memberIds.filter((id) => allowed.has(id)))

      const leadId = data.leadId !== undefined ? data.leadId : before.lead
      if (leadId && allowed.has(leadId)) nextIds.add(leadId)

      const nextIdList = [...nextIds]
      if (
        !sameIdSet(
          beforeMembers.map((m) => m.userId),
          nextIdList
        )
      ) {
        const names =
          nextIdList.length > 0
            ? (
                await db
                  .select({ name: user.name })
                  .from(user)
                  .where(inArray(user.id, nextIdList))
                  .orderBy(asc(user.name))
              ).map((u) => u.name)
            : []
        activityRows.push({
          type: "member-change",
          message:
            names.length > 0
              ? `${actorName} updated members to ${names.join(", ")}`
              : `${actorName} cleared members`,
        })
      }

      await db
        .delete(projectMember)
        .where(eq(projectMember.projectId, data.projectId))
      if (nextIds.size > 0) {
        await db.insert(projectMember).values(
          [...nextIds].map((userId) => ({
            projectId: data.projectId,
            userId,
          }))
        )
      }
    }

    if (data.teamIds !== undefined) {
      const orgTeams = await db
        .select({ id: team.id, identifier: team.identifier, name: team.name })
        .from(team)
        .where(eq(team.organizationId, organizationId))
      const allowed = new Map(orgTeams.map((t) => [t.id, t]))
      const nextIds = [...new Set(data.teamIds.filter((id) => allowed.has(id)))]

      if (
        !sameIdSet(
          beforeTeams.map((t) => t.teamId),
          nextIds
        )
      ) {
        const labels = nextIds.map(
          (id) => allowed.get(id)?.identifier || allowed.get(id)?.name || id
        )
        activityRows.push({
          type: "team-change",
          message:
            labels.length > 0
              ? `${actorName} updated teams to ${labels.join(", ")}`
              : `${actorName} cleared teams`,
        })
      }

      await db
        .delete(projectTeam)
        .where(eq(projectTeam.projectId, data.projectId))
      if (nextIds.length > 0) {
        await db.insert(projectTeam).values(
          nextIds.map((teamId) => ({
            projectId: data.projectId,
            teamId,
          }))
        )
      }
    }

    if (data.labelIds !== undefined) {
      const allLabels = await db
        .select({ id: label.id, name: label.name })
        .from(label)
        .where(eq(label.organizationId, organizationId))
      const allowed = new Map(allLabels.map((l) => [l.id, l.name]))
      const nextIds = [
        ...new Set(data.labelIds.filter((id) => allowed.has(id))),
      ]

      if (
        !sameIdSet(
          beforeLabels.map((l) => l.id),
          nextIds
        )
      ) {
        const names = nextIds.map((id) => allowed.get(id)!).filter(Boolean)
        activityRows.push({
          type: "label-change",
          message:
            names.length > 0
              ? `${actorName} updated labels to ${names.join(", ")}`
              : `${actorName} cleared labels`,
        })
      }

      await db
        .delete(projectToLabel)
        .where(eq(projectToLabel.projectId, data.projectId))
      if (nextIds.length > 0) {
        await db.insert(projectToLabel).values(
          nextIds.map((labelId) => ({
            projectId: data.projectId,
            labelId,
          }))
        )
      }
    }

    // Always bump updatedAt so activity pages watching it can refresh.
    patch.updatedAt = new Date()

    if (Object.keys(patch).length > 0) {
      await db.update(project).set(patch).where(eq(project.id, data.projectId))
    }

    for (const row of activityRows) {
      await recordProjectActivity(db, {
        projectId: data.projectId,
        actorId,
        type: row.type,
        message: row.message,
      })
    }

    return getProject({ data: { projectId: data.projectId } })
  })

export const createProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2, "Project name is required"),
      priority: z.number().int().min(0).max(4).default(0),
      /** Defaults to creation day when omitted. */
      startDate: z.string().optional(),
      /** Defaults to creation day + 14 days when omitted. */
      targetDate: z.string().optional(),
      leadId: z.string().optional(),
      teamId: z.string().min(1).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    const defaults = suggestedProjectPeriod()
    const startDate = data.startDate
      ? new Date(data.startDate)
      : defaults.startDate
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Invalid start date")
    }

    const targetDate = data.targetDate
      ? new Date(data.targetDate)
      : defaults.targetDate
    if (Number.isNaN(targetDate.getTime())) {
      throw new Error("Invalid target date")
    }

    if (data.teamId) {
      const [teamRow] = await db
        .select({ id: team.id })
        .from(team)
        .where(
          and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
        )
        .limit(1)
      if (!teamRow) throw new Error("Team not found")
    }

    const leadId = data.leadId ?? session.user.id
    if (data.leadId) {
      const [leadMember] = await db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.userId, data.leadId),
            eq(member.organizationId, organizationId)
          )
        )
        .limit(1)
      if (!leadMember) throw new Error("Lead must be an organization member")
    }

    const projectId = generateUUID()
    const [created] = await db
      .insert(project)
      .values({
        id: projectId,
        name: data.name.trim(),
        organizationId,
        userId: session.user.id,
        lead: leadId,
        priority: data.priority,
        status: "backlog",
        startDate,
        targetDate,
        issuesCount: 0,
        progress: 0,
      })
      .returning()

    await db.insert(projectActivity).values({
      id: generateUUID(),
      projectId,
      type: "created",
      userId: session.user.id,
      message: `${session.user.name} created the project`,
    })

    await db.insert(projectMember).values({
      projectId,
      userId: leadId,
    })

    if (data.teamId) {
      await db.insert(projectTeam).values({
        projectId,
        teamId: data.teamId,
      })
    }

    return created
  })

export const listProjectActivity = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    return db
      .select({
        id: projectActivity.id,
        type: projectActivity.type,
        message: projectActivity.message,
        createdAt: projectActivity.createdAt,
        userId: user.id,
        userName: user.name,
        userImage: user.image,
      })
      .from(projectActivity)
      .leftJoin(user, eq(projectActivity.userId, user.id))
      .where(eq(projectActivity.projectId, data.projectId))
      .orderBy(desc(projectActivity.createdAt))
  })

/** Org members available for lead / project members. */
export const listOrgMemberOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { organizationId } = await requireOrgSession()
    return db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(user.name))
  }
)

export const listOrgTeamOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { organizationId } = await requireOrgSession()
    return db
      .select({
        teamId: team.id,
        name: team.name,
        identifier: team.identifier,
      })
      .from(team)
      .where(eq(team.organizationId, organizationId))
      .orderBy(asc(team.name))
  }
)

export const deleteProject = createServerFn({ method: "POST" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireProjectInOrg(data.projectId, organizationId)

    const deleted = await db
      .delete(project)
      .where(
        and(
          eq(project.id, data.projectId),
          eq(project.organizationId, organizationId)
        )
      )
      .returning({ id: project.id })

    if (deleted.length === 0) throw new Error("Project not found")
    return { ok: true as const, projectId: data.projectId }
  })
