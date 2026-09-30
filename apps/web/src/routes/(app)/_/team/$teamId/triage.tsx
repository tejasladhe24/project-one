import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"
import { TeamTriageView } from "@/components/team/team-triage-view"
import { listIssues } from "@/lib/issues"
import { listLabels } from "@/lib/labels"
import { listProjectOptions } from "@/lib/projects"
import { pageMeta } from "@/lib/seo"
import { listStatuses } from "@/lib/statuses"
import { listTeamMembersDetailed } from "@/lib/teams"

const triageSearchSchema = z.object({
  issue: z.string().optional(),
})

export const Route = createFileRoute("/(app)/_/team/$teamId/triage")({
  validateSearch: triageSearchSchema,
  loaderDeps: ({ search }) => ({ issueId: search.issue }),
  loader: async ({ params, deps, context }) => {
    const team = context.team
    const [issues, statuses, members, projects, labels] = await Promise.all([
      listIssues({
        data: {
          teamId: params.teamId,
          statusCategory: "triage",
          includeDescription: true,
        },
      }),
      listStatuses({ data: { teamId: params.teamId } }),
      listTeamMembersDetailed({ data: { teamId: params.teamId } }),
      listProjectOptions(),
      listLabels(),
    ])

    const triageIssues = issues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      teamIdentifier: issue.teamIdentifier,
      statusId: issue.statusId,
      statusName: issue.statusName,
      statusCategory: issue.statusCategory,
      statusSortOrder: issue.statusSortOrder,
      projectId: issue.projectId,
      projectName: issue.projectName,
      assigneeId: issue.assigneeId,
      assigneeName: issue.assigneeName,
      assigneeImage: issue.assigneeImage,
      labels: issue.labels,
      cycleNumber: issue.cycleNumber,
      cyclesEnabled: issue.cyclesEnabled,
      cycleDurationWeeks: issue.cycleDurationWeeks,
      cycleStartDay: issue.cycleStartDay,
      cyclesOrigin: issue.cyclesOrigin,
    }))

    const selectedId =
      deps.issueId && triageIssues.some((i) => i.id === deps.issueId)
        ? deps.issueId
        : (triageIssues[0]?.id ?? null)

    if (!deps.issueId && selectedId) {
      throw redirect({
        to: "/team/$teamId/triage",
        params: { teamId: params.teamId },
        search: { issue: selectedId },
        replace: true,
      })
    }

    return {
      team,
      issues: triageIssues,
      selectedId,
      statuses: statuses.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        sortOrder: s.sortOrder,
        isDefault: s.isDefault,
      })),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name,
        image: m.image,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      labels: labels.map((l) => ({
        id: l.id,
        name: l.name,
      })),
    }
  },
  head: ({ loaderData }) => {
    const teamName = loaderData?.team?.name
    const selected = loaderData?.issues?.find(
      (i) => i.id === loaderData.selectedId
    )
    const title = selected?.title
      ? `Triage · ${selected.title}`
      : teamName
        ? `Triage · ${teamName}`
        : "Triage"
    return pageMeta({ title, noIndex: true })
  },
  component: TeamTriagePage,
})

function TeamTriagePage() {
  const { team, issues, selectedId, statuses, members, projects, labels } =
    Route.useLoaderData()
  const { teamId } = Route.useParams()

  return (
    <TeamTriageView
      teamId={teamId}
      teamName={team.name}
      issues={issues}
      selectedId={selectedId}
      statuses={statuses}
      members={members}
      projects={projects}
      labels={labels}
    />
  )
}
