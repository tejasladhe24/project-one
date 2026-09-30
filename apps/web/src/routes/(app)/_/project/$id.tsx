import {
  createFileRoute,
  notFound,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import { ProjectShell } from "@/components/project/project-shell"
import { listLabels } from "@/lib/labels"
import {
  getProject,
  listOrgMemberOptions,
  listOrgTeamOptions,
} from "@/lib/projects"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/project/$id")({
  loader: async ({ params }) => {
    try {
      const [project, members, teams, labels] = await Promise.all([
        getProject({ data: { projectId: params.id } }),
        listOrgMemberOptions(),
        listOrgTeamOptions(),
        listLabels(),
      ])
      return {
        project,
        metaOptions: {
          members,
          teams,
          labels: labels.map((l) => ({ id: l.id, name: l.name })),
        },
      }
    } catch {
      throw notFound()
    }
  },
  head: ({ loaderData }) =>
    pageMeta({
      title: loaderData?.project?.name ?? "Project",
      noIndex: true,
    }),
  component: ProjectLayout,
})

function ProjectLayout() {
  const { project } = Route.useLoaderData()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const activeTab = pathname.endsWith("/activity")
    ? ("activity" as const)
    : pathname.endsWith("/issues")
      ? ("issues" as const)
      : ("overview" as const)

  return (
    <ProjectShell project={project} activeTab={activeTab}>
      <Outlet />
    </ProjectShell>
  )
}
