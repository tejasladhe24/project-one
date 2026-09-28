import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { issue, member, project, team, teamMember } from "@/db/schema"

export async function requireTeamInOrg(teamId: string, organizationId: string) {
  const [owned] = await db
    .select({ id: team.id })
    .from(team)
    .where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)))
    .limit(1)
  if (!owned) throw new Error("Team not found")
  return owned
}

export async function requireProjectInOrg(
  projectId: string,
  organizationId: string
) {
  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(eq(project.id, projectId), eq(project.organizationId, organizationId))
    )
    .limit(1)
  if (!owned) throw new Error("Project not found")
  return owned
}

export async function requireOrgMember(userId: string, organizationId: string) {
  const [row] = await db
    .select({ id: member.id, userId: member.userId })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1)
  if (!row) throw new Error("User is not a member of this organization")
  return row
}

/** Issue belongs to org team AND caller is a team member. */
export async function requireTeamIssueAccess(
  teamId: string,
  issueId: string,
  organizationId: string,
  userId: string
) {
  const [issueRow, membership] = await Promise.all([
    db
      .select({ id: issue.id })
      .from(issue)
      .innerJoin(team, eq(issue.teamId, team.id))
      .where(
        and(
          eq(issue.id, issueId),
          eq(issue.teamId, teamId),
          eq(team.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]),
  ])

  if (!issueRow) throw new Error("Issue not found")
  if (!membership) throw new Error("Not a team member")
  return issueRow
}
