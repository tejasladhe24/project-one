import { createServerFn } from "@tanstack/react-start"
import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { issue, member, project, team, user } from "@/db/schema"
import { getOptionalOrgSession } from "@/lib/server/session"

export type CommandSearchIssue = {
  id: string
  number: number
  title: string
  teamIdentifier: string | null
}

export type CommandSearchProject = {
  id: string
  name: string
}

export type CommandSearchMember = {
  id: string
  userId: string
  name: string
  email: string
  image: string | null
}

export type CommandSearchData = {
  issues: CommandSearchIssue[]
  projects: CommandSearchProject[]
  members: CommandSearchMember[]
}

export const getCommandSearchData = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommandSearchData> => {
    const { organizationId } = await getOptionalOrgSession()
    if (!organizationId) {
      return { issues: [], projects: [], members: [] }
    }

    const [issues, projects, members] = await Promise.all([
      db
        .select({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          teamIdentifier: team.identifier,
        })
        .from(issue)
        .innerJoin(team, eq(issue.teamId, team.id))
        .where(eq(team.organizationId, organizationId))
        .orderBy(desc(issue.updatedAt)),
      db
        .select({
          id: project.id,
          name: project.name,
        })
        .from(project)
        .where(eq(project.organizationId, organizationId))
        .orderBy(asc(project.name)),
      db
        .select({
          id: member.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId))
        .orderBy(asc(user.name)),
    ])

    return { issues, projects, members }
  }
)
