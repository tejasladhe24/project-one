import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ProjectsTable,
  type ProjectRow,
} from "@/components/projects/projects-table"
import { listTeamProjects } from "@/lib/projects"
import { pageMeta } from "@/lib/seo"

function toProjectRows(
  data: Awaited<ReturnType<typeof listTeamProjects>>
): ProjectRow[] {
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    priority: item.priority,
    leadName: item.leadName,
    leadImage: item.leadImage,
    startDate: item.startDate
      ? typeof item.startDate === "string"
        ? item.startDate
        : new Date(item.startDate).toISOString()
      : null,
    targetDate:
      typeof item.targetDate === "string"
        ? item.targetDate
        : new Date(item.targetDate).toISOString(),
    issuesCount: item.issuesCount,
    progress: item.progress,
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : new Date(item.createdAt).toISOString(),
    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : new Date(item.updatedAt).toISOString(),
  }))
}

export const Route = createFileRoute("/(app)/_/team/$teamId/projects")({
  loader: async ({ params, context }) => {
    const team = context.team
    const [data] = await Promise.all([
      listTeamProjects({ data: { teamId: params.teamId } }),
    ])
    return { team, projects: toProjectRows(data) }
  },
  head: ({ loaderData }) =>
    pageMeta({
      title: loaderData?.team?.name
        ? `Projects · ${loaderData.team.name}`
        : "Projects",
      noIndex: true,
    }),
  component: TeamProjectsPage,
})

function TeamProjectsPage() {
  const { projects, team } = Route.useLoaderData()
  const { teamId } = Route.useParams()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-lg font-semibold tracking-tight">
          {team.name} projects
        </h1>
        <p className="text-sm text-muted-foreground">
          Projects linked to this team.
        </p>
      </div>
      <ProjectsTable
        data={projects}
        teamId={teamId}
        onCreated={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
