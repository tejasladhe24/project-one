import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { IssuesTable } from "@/components/issues/issues-table"
import { getCurrentCycleNumber } from "@/lib/cycles/dates"
import { listIssues, toIssueRows } from "@/lib/issues"
import { listProjectOptions } from "@/lib/projects"

export const Route = createFileRoute("/(app)/_/team/$teamId/cycles")({
  loader: async ({ params, context }) => {
    const team = context.team
    if (!team.cyclesEnabled) {
      throw redirect({
        to: "/team/$teamId/settings/cycles",
        params: { teamId: params.teamId },
      })
    }

    const [issues, projects] = await Promise.all([
      listIssues({
        data: { teamId: params.teamId, inCycle: true },
      }),
      listProjectOptions(),
    ])

    const cycleSettings = {
      cyclesEnabled: team.cyclesEnabled,
      cycleDurationWeeks: team.cycleDurationWeeks,
      cycleStartDay: team.cycleStartDay,
      cyclesOrigin: team.cyclesOrigin
        ? typeof team.cyclesOrigin === "string"
          ? team.cyclesOrigin
          : new Date(team.cyclesOrigin).toISOString()
        : null,
    }

    return {
      team,
      issues: toIssueRows(issues),
      projects: (projects ?? []).map((p) => ({ id: p.id, name: p.name })),
      currentCycleNumber: getCurrentCycleNumber(cycleSettings),
      cycleSettings,
    }
  },
  component: TeamCyclesPage,
})

function TeamCyclesPage() {
  const { team, issues, projects, currentCycleNumber, cycleSettings } =
    Route.useLoaderData()
  const { teamId } = Route.useParams()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <IssuesTable
        data={issues}
        projects={projects}
        teams={[
          {
            id: team.id,
            name: team.name,
            identifier: team.identifier,
          },
        ]}
        teamId={teamId}
        teamName={team.name}
        mode="team"
        groupBy="cycle"
        title="Cycles"
        emptyMessage="No issues in cycles yet. Move issues into the current cycle from the issues table."
        hideCreate
        currentCycleNumber={currentCycleNumber}
        cycleSettings={cycleSettings}
        onUpdated={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
