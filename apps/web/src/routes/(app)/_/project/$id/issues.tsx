import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router"
import { IssuesTable } from "@/components/issues/issues-table"
import { ProjectSplitLayout } from "@/components/project/project-shell"
import { listIssues, toIssueRows } from "@/lib/issues"
import { listProjectOptions } from "@/lib/projects"
import { listUserTeams } from "@/lib/auth/session"

const projectRoute = getRouteApi("/(app)/_/project/$id")

export const Route = createFileRoute("/(app)/_/project/$id/issues")({
  loader: async ({ params }) => {
    const [issues, projects, teams] = await Promise.all([
      listIssues({ data: { projectId: params.id } }),
      listProjectOptions(),
      listUserTeams(),
    ])
    return {
      issues: toIssueRows(issues),
      projects: (projects ?? []).map((p) => ({ id: p.id, name: p.name })),
      teams: (teams ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        identifier:
          "identifier" in t && typeof t.identifier === "string"
            ? t.identifier
            : null,
      })),
    }
  },
  component: ProjectIssuesPage,
})

function ProjectIssuesPage() {
  const { project, metaOptions } = projectRoute.useLoaderData()
  const { issues, projects, teams } = Route.useLoaderData()
  const router = useRouter()

  return (
    <ProjectSplitLayout project={project} options={metaOptions}>
      <IssuesTable
        data={issues}
        projects={projects}
        teams={teams}
        mode="team"
        title="Issues"
        emptyMessage="No issues in this project yet."
        hideCreate
        onUpdated={() => {
          void router.invalidate()
        }}
      />
    </ProjectSplitLayout>
  )
}
