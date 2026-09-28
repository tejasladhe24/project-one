import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { team, teamMember } from "@/db/schema"
import {
  CYCLE_DURATION_WEEKS,
  formatCycleRangeLabel,
  getCurrentCycleNumber,
  startOfCycleWeek,
  type TeamCycleSettings,
} from "@/lib/cycles/dates"
import { requireOrgSession } from "@/lib/server/session"

function toCycleSettings(row: {
  cyclesEnabled: boolean
  cycleDurationWeeks: number
  cycleStartDay: number
  cyclesOrigin: Date | null
}): TeamCycleSettings {
  return {
    cyclesEnabled: row.cyclesEnabled,
    cycleDurationWeeks: row.cycleDurationWeeks,
    cycleStartDay: row.cycleStartDay,
    cyclesOrigin: row.cyclesOrigin,
  }
}

async function requireTeamMember(teamId: string) {
  const { session, organizationId } = await requireOrgSession()
  const [row] = await db
    .select({
      id: team.id,
      name: team.name,
      identifier: team.identifier,
      cyclesEnabled: team.cyclesEnabled,
      cycleDurationWeeks: team.cycleDurationWeeks,
      cycleStartDay: team.cycleStartDay,
      cyclesOrigin: team.cyclesOrigin,
    })
    .from(team)
    .innerJoin(
      teamMember,
      and(
        eq(teamMember.teamId, team.id),
        eq(teamMember.userId, session.user.id)
      )
    )
    .where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)))
    .limit(1)
  if (!row) throw new Error("Team not found")
  return { session, organizationId, team: row }
}

export const updateTeamCycleSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      cyclesEnabled: z.boolean(),
      cycleDurationWeeks: z
        .number()
        .int()
        .refine((v): v is (typeof CYCLE_DURATION_WEEKS)[number] =>
          (CYCLE_DURATION_WEEKS as readonly number[]).includes(v)
        ),
      cycleStartDay: z.number().int().min(0).max(6),
    })
  )
  .handler(async ({ data }) => {
    const { team: owned } = await requireTeamMember(data.teamId)

    let cyclesOrigin = owned.cyclesOrigin
    if (data.cyclesEnabled) {
      const scheduleChanged =
        owned.cycleDurationWeeks !== data.cycleDurationWeeks ||
        owned.cycleStartDay !== data.cycleStartDay
      if (!cyclesOrigin || scheduleChanged) {
        cyclesOrigin = startOfCycleWeek(new Date(), data.cycleStartDay)
      }
    }

    const [updated] = await db
      .update(team)
      .set({
        cyclesEnabled: data.cyclesEnabled,
        cycleDurationWeeks: data.cycleDurationWeeks,
        cycleStartDay: data.cycleStartDay,
        cyclesOrigin,
      })
      .where(eq(team.id, data.teamId))
      .returning({
        id: team.id,
        cyclesEnabled: team.cyclesEnabled,
        cycleDurationWeeks: team.cycleDurationWeeks,
        cycleStartDay: team.cycleStartDay,
        cyclesOrigin: team.cyclesOrigin,
      })

    if (!updated) throw new Error("Could not update cycle settings")

    const settings = toCycleSettings(updated)
    const currentCycleNumber = getCurrentCycleNumber(settings)
    return {
      ...settings,
      currentCycleNumber,
      currentCycleLabel:
        currentCycleNumber != null
          ? formatCycleRangeLabel(settings, currentCycleNumber)
          : null,
    }
  })

/** Teams for sidebar, including whether Cycles is enabled. */
export const listSidebarTeams = createServerFn({ method: "GET" }).handler(
  async () => {
    const { session, organizationId } = await requireOrgSession()
    const rows = await db
      .select({
        id: team.id,
        name: team.name,
        cyclesEnabled: team.cyclesEnabled,
      })
      .from(team)
      .innerJoin(
        teamMember,
        and(
          eq(teamMember.teamId, team.id),
          eq(teamMember.userId, session.user.id)
        )
      )
      .where(eq(team.organizationId, organizationId))
      .orderBy(asc(team.name))

    return rows
  }
)
