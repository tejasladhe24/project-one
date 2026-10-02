import { createFileRoute, useRouter } from "@tanstack/react-router"
import { IssuesTable, type IssueRow } from "@/components/issues/issues-table"
import { listUserTeams } from "@/lib/auth/session"
import { listIssues, toIssueRows } from "@/lib/issues"
import { listProjectOptions } from "@/lib/projects"
import { pageMeta } from "@/lib/seo"
import { z } from "zod"

const issuesSearchSchema = z.object({
  team_id: z.string().optional(),
})

export const Route = createFileRoute("/(app)/_/issues")({
  validateSearch: issuesSearchSchema,
  loaderDeps: ({ search }) => ({ teamId: search.team_id }),
  loader: async ({ deps, context }) => {
    const session = context.session
    const organizationId = session.session.activeOrganizationId
    if (!organizationId) {
      throw new Error("No active organization")
    }
    const mine = !deps.teamId
    const [issues, projects, teams] = await Promise.all([
      listIssues({
        data: {
          teamId: deps.teamId,
          mine,
        },
      }),
      listProjectOptions(),
      listUserTeams(),
    ])
    const teamOptions = (teams ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      identifier:
        "identifier" in t && typeof t.identifier === "string"
          ? t.identifier
          : null,
    }))
    const teamName = deps.teamId
      ? teamOptions.find((t) => t.id === deps.teamId)?.name
      : undefined

    return {
      mode: mine ? ("mine" as const) : ("team" as const),
      currentUserId: session.user.id,
      organizationId,
      teamId: deps.teamId,
      teamName,
      teams: teamOptions,
      issues: toIssueRows(issues) satisfies IssueRow[],
      projects: (projects ?? []).map((p) => ({ id: p.id, name: p.name })),
    }
  },
  head: () => pageMeta({ title: "Issues", noIndex: true }),
  component: IssuesPage,
})

function IssuesPage() {
  const {
    issues,
    projects,
    teams,
    organizationId,
    teamId,
    teamName,
    mode,
    currentUserId,
  } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <IssuesTable
        data={issues}
        projects={projects}
        teams={teams}
        organizationId={organizationId}
        teamId={teamId}
        teamName={teamName}
        mode={mode}
        currentUserId={currentUserId}
        onCreated={() => {
          void router.invalidate()
        }}
        onUpdated={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
