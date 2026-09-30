import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ProjectsTable,
  type ProjectRow,
} from "@/components/projects/projects-table"
import { listProjects } from "@/lib/projects"
import { pageMeta } from "@/lib/seo"

function toProjectRows(
  data: Awaited<ReturnType<typeof listProjects>>
): ProjectRow[] {
  if (!data) return []

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

export const Route = createFileRoute("/(app)/_/projects")({
  loader: async () => {
    const data = await listProjects()
    return { projects: toProjectRows(data) }
  },
  head: () => pageMeta({ title: "Projects", noIndex: true }),
  component: ProjectsPage,
})

function ProjectsPage() {
  const { projects } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <ProjectsTable
        data={projects}
        onCreated={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
