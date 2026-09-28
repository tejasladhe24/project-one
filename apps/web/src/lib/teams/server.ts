import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import {
  inboxNotification,
  issueStatus,
  label,
  member,
  team,
  teamMember,
  user,
} from "@/db/schema"
import { auth } from "@/lib/auth/server"
import { ESTIMATE_TYPES, parseEstimateType } from "@/lib/estimates"
import { requireOrgSession } from "@/lib/server/session"
import { listStatuses } from "@/lib/statuses"
import { generateUUID } from "@/lib/utils"

function isOrgAdminRole(role: string | null | undefined) {
  if (!role) return false
  const roles = role.split(",").map((r) => r.trim().toLowerCase())
  return roles.includes("owner") || roles.includes("admin")
}

/** All organization teams, with whether the current user is a member. */
export const listOrgTeamsWithMembership = createServerFn({
  method: "GET",
}).handler(async () => {
  const { session, organizationId } = await requireOrgSession()

  const teams = await db
    .select({
      id: team.id,
      name: team.name,
      memberCount: team.memberCount,
      createdAt: team.createdAt,
      membershipId: teamMember.id,
    })
    .from(team)
    .leftJoin(
      teamMember,
      and(
        eq(teamMember.teamId, team.id),
        eq(teamMember.userId, session.user.id)
      )
    )
    .where(eq(team.organizationId, organizationId))
    .orderBy(asc(team.name))

  return teams.map((row) => ({
    id: row.id,
    name: row.name,
    memberCount: row.memberCount,
    createdAt: row.createdAt,
    isMember: row.membershipId != null,
  }))
})

export const getTeam = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    const [row] = await db
      .select({
        id: team.id,
        name: team.name,
        identifier: team.identifier,
        description: team.description,
        memberCount: team.memberCount,
        estimateType: team.estimateType,
        allowZeroEstimates: team.allowZeroEstimates,
        extendedEstimateScale: team.extendedEstimateScale,
        countUnestimatedIssues: team.countUnestimatedIssues,
        cyclesEnabled: team.cyclesEnabled,
        cycleDurationWeeks: team.cycleDurationWeeks,
        cycleStartDay: team.cycleStartDay,
        cyclesOrigin: team.cyclesOrigin,
        organizationId: team.organizationId,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      })
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

    if (!row) throw new Error("Team not found")
    return {
      ...row,
      estimateType: parseEstimateType(row.estimateType),
    }
  })

export const updateTeamSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      name: z.string().min(2).optional(),
      identifier: z
        .string()
        .min(1)
        .max(4)
        .regex(/^[A-Za-z0-9]+$/)
        .optional(),
      description: z.string().max(500).nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { headers } = await requireOrgSession()

    const payload: {
      name?: string
      identifier?: string
      description?: string
    } = {}
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.identifier !== undefined) {
      payload.identifier = data.identifier.trim().toUpperCase()
    }
    if (data.description !== undefined) {
      payload.description = data.description?.trim() || ""
    }

    return auth.api.updateTeam({
      headers,
      body: {
        teamId: data.teamId,
        data: payload,
      },
    })
  })

export const updateTeamEstimateSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      estimateType: z.enum(ESTIMATE_TYPES),
      allowZeroEstimates: z.boolean(),
      extendedEstimateScale: z.boolean(),
      countUnestimatedIssues: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    const [owned] = await db
      .select({ id: team.id })
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

    const [updated] = await db
      .update(team)
      .set({
        estimateType: data.estimateType,
        allowZeroEstimates: data.allowZeroEstimates,
        extendedEstimateScale: data.extendedEstimateScale,
        countUnestimatedIssues: data.countUnestimatedIssues,
      })
      .where(eq(team.id, data.teamId))
      .returning({
        id: team.id,
        estimateType: team.estimateType,
        allowZeroEstimates: team.allowZeroEstimates,
        extendedEstimateScale: team.extendedEstimateScale,
        countUnestimatedIssues: team.countUnestimatedIssues,
      })

    if (!updated) throw new Error("Could not update estimate settings")
    return {
      ...updated,
      estimateType: parseEstimateType(updated.estimateType),
    }
  })

export const removeTeam = createServerFn({ method: "POST" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { headers, session } = await requireOrgSession()

    // Better Auth forbids deleting the session's active team.
    if (session.session.activeTeamId === data.teamId) {
      await auth.api.setActiveTeam({
        headers,
        body: { teamId: null },
      })
    }

    return auth.api.removeTeam({
      headers,
      body: { teamId: data.teamId },
    })
  })

export const leaveTeam = createServerFn({ method: "POST" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { headers, session, organizationId } = await requireOrgSession()

    const [owned] = await db
      .select({ id: team.id })
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
    if (!owned) throw new Error("You are not a member of this team")

    if (session.session.activeTeamId === data.teamId) {
      await auth.api.setActiveTeam({
        headers,
        body: { teamId: null },
      })
    }

    return auth.api.removeTeamMember({
      headers,
      body: {
        teamId: data.teamId,
        userId: session.user.id,
      },
    })
  })

/**
 * Notify org owners/admins (inbox only) that the current user wants to join
 * a team they are not already on.
 */
export const requestTeamJoin = createServerFn({ method: "POST" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()

    const [teamRow] = await db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!teamRow) throw new Error("Team not found")

    const [alreadyMember] = await db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(
        and(
          eq(teamMember.teamId, data.teamId),
          eq(teamMember.userId, session.user.id)
        )
      )
      .limit(1)
    if (alreadyMember) throw new Error("You are already a member of this team")

    const [existingRequest] = await db
      .select({ id: inboxNotification.id })
      .from(inboxNotification)
      .where(
        and(
          eq(inboxNotification.organizationId, organizationId),
          eq(inboxNotification.actorId, session.user.id),
          eq(inboxNotification.teamId, data.teamId),
          eq(inboxNotification.type, "team"),
          isNull(inboxNotification.readAt)
        )
      )
      .limit(1)
    if (existingRequest) {
      throw new Error("You already have a pending join request for this team")
    }

    const orgMembers = await db
      .select({
        userId: member.userId,
        role: member.role,
      })
      .from(member)
      .where(eq(member.organizationId, organizationId))

    const recipientIds = [
      ...new Set(
        orgMembers
          .filter((m) => isOrgAdminRole(m.role) && m.userId !== session.user.id)
          .map((m) => m.userId)
      ),
    ]

    if (recipientIds.length === 0) {
      throw new Error("No owners or admins to notify")
    }

    const title = `Join request: ${teamRow.name}`
    const body = `${session.user.name} requested to join ${teamRow.name}`

    await db.insert(inboxNotification).values(
      recipientIds.map((userId) => ({
        id: generateUUID(),
        organizationId,
        userId,
        type: "team" as const,
        activityId: null,
        issueId: null,
        teamId: data.teamId,
        actorId: session.user.id,
        title,
        body,
        isPriority: true,
      }))
    )

    return { ok: true as const, notified: recipientIds.length }
  })

async function requireOrgAdmin() {
  const ctx = await requireOrgSession()
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, ctx.organizationId),
        eq(member.userId, ctx.session.user.id)
      )
    )
    .limit(1)
  if (!row || !isOrgAdminRole(row.role)) {
    throw new Error("Only owners and admins can manage join requests")
  }
  return ctx
}

async function clearTeamJoinNotifications(input: {
  organizationId: string
  teamId: string
  actorId: string
}) {
  await db
    .update(inboxNotification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(inboxNotification.organizationId, input.organizationId),
        eq(inboxNotification.teamId, input.teamId),
        eq(inboxNotification.actorId, input.actorId),
        eq(inboxNotification.type, "team"),
        isNull(inboxNotification.readAt)
      )
    )
}

/** Pending join requests for a team (deduped by requester). */
export const listTeamJoinRequests = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgAdmin()

    const [owned] = await db
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Team not found")

    const rows = await db
      .select({
        id: inboxNotification.id,
        createdAt: inboxNotification.createdAt,
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        actorImage: user.image,
      })
      .from(inboxNotification)
      .innerJoin(user, eq(inboxNotification.actorId, user.id))
      .where(
        and(
          eq(inboxNotification.organizationId, organizationId),
          eq(inboxNotification.teamId, data.teamId),
          eq(inboxNotification.type, "team"),
          isNull(inboxNotification.readAt)
        )
      )
      .orderBy(asc(inboxNotification.createdAt))

    // One row per requester (notifications are fan-out to each admin).
    const seen = new Set<string>()
    const unique: typeof rows = []
    for (const row of rows) {
      if (!row.actorId || seen.has(row.actorId)) continue
      seen.add(row.actorId)
      unique.push(row)
    }
    return unique
  })

/** Accept a team join request: add requester as member and clear pending inbox rows. */
export const acceptTeamJoinRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      userId: z.string().min(1),
      notificationId: z.string().min(1).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { headers, organizationId } = await requireOrgAdmin()

    const [teamRow] = await db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!teamRow) throw new Error("Team not found")

    const [orgMember] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, data.userId),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1)
    if (!orgMember) throw new Error("User is not a member of this organization")

    const pendingWhere = and(
      eq(inboxNotification.organizationId, organizationId),
      eq(inboxNotification.teamId, data.teamId),
      eq(inboxNotification.actorId, data.userId),
      eq(inboxNotification.type, "team"),
      isNull(inboxNotification.readAt)
    )

    if (data.notificationId) {
      const [notification] = await db
        .select({
          id: inboxNotification.id,
          teamId: inboxNotification.teamId,
          actorId: inboxNotification.actorId,
          type: inboxNotification.type,
        })
        .from(inboxNotification)
        .where(
          and(
            eq(inboxNotification.id, data.notificationId),
            pendingWhere
          )
        )
        .limit(1)
      if (!notification) {
        throw new Error("Join request not found")
      }
    } else {
      const [pending] = await db
        .select({ id: inboxNotification.id })
        .from(inboxNotification)
        .where(pendingWhere)
        .limit(1)
      if (!pending) throw new Error("Join request not found")
    }

    const [alreadyMember] = await db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(
        and(
          eq(teamMember.teamId, data.teamId),
          eq(teamMember.userId, data.userId)
        )
      )
      .limit(1)

    if (!alreadyMember) {
      await auth.api.addTeamMember({
        headers,
        body: {
          teamId: data.teamId,
          userId: data.userId,
        },
      })
    }

    await clearTeamJoinNotifications({
      organizationId,
      teamId: data.teamId,
      actorId: data.userId,
    })

    return { ok: true as const, teamName: teamRow.name }
  })

/** Decline a team join request and clear pending inbox rows for that requester. */
export const declineTeamJoinRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgAdmin()

    const [owned] = await db
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Team not found")

    await clearTeamJoinNotifications({
      organizationId,
      teamId: data.teamId,
      actorId: data.userId,
    })

    return { ok: true as const }
  })

export const listTeamMembersDetailed = createServerFn({ method: "GET" })

  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [owned] = await db
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Team not found")

    const rows = await db
      .select({
        id: teamMember.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: member.role,
        createdAt: teamMember.createdAt,
      })
      .from(teamMember)
      .innerJoin(user, eq(teamMember.userId, user.id))
      .leftJoin(
        member,
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, organizationId)
        )
      )
      .where(eq(teamMember.teamId, data.teamId))
      .orderBy(asc(user.name))

    return rows
  })

export const listOrgMembersForTeamAdd = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [owned] = await db
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Team not found")

    const existing = await db
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, data.teamId))
    const existingIds = new Set(existing.map((m) => m.userId))

    const orgMembers = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(user.name))

    return orgMembers.filter((m) => !existingIds.has(m.userId))
  })

export const addMemberToTeam = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { headers } = await requireOrgSession()
    return auth.api.addTeamMember({
      headers,
      body: {
        teamId: data.teamId,
        userId: data.userId,
      },
    })
  })

export const removeMemberFromTeam = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { headers } = await requireOrgSession()
    return auth.api.removeTeamMember({
      headers,
      body: {
        teamId: data.teamId,
        userId: data.userId,
      },
    })
  })

export const listTeamIssueStatuses = listStatuses

export const getTeamSettingsSummary = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [row] = await db
      .select({
        id: team.id,
        name: team.name,
        identifier: team.identifier,
        description: team.description,
        memberCount: team.memberCount,
      })
      .from(team)
      .where(
        and(eq(team.id, data.teamId), eq(team.organizationId, organizationId))
      )
      .limit(1)

    if (!row) throw new Error("Team not found")

    const [[memberCountRow], [labelCountRow], [statusCountRow]] =
      await Promise.all([
        db
          .select({ value: count() })
          .from(teamMember)
          .where(eq(teamMember.teamId, data.teamId)),
        db
          .select({ value: count() })
          .from(label)
          .where(eq(label.organizationId, organizationId)),
        db
          .select({ value: count() })
          .from(issueStatus)
          .where(eq(issueStatus.teamId, data.teamId)),
      ])

    return {
      ...row,
      memberCount: Number(memberCountRow?.value ?? row.memberCount),
      labelCount: Number(labelCountRow?.value ?? 0),
      statusCount: Number(statusCountRow?.value ?? 0),
      templateCount: 0,
    }
  })
