import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { ProjectActivity } from "@/components/project/project-activity"
import { ProjectSplitLayout } from "@/components/project/project-shell"

const projectRoute = getRouteApi("/(app)/_/project/$id")

export const Route = createFileRoute("/(app)/_/project/$id/activity")({
  loader: ({ context }) => ({
    currentUserId: context.session.user.id,
  }),
  component: ProjectActivityPage,
})

function ProjectActivityPage() {
  const { project, metaOptions } = projectRoute.useLoaderData()
  const { currentUserId } = Route.useLoaderData()

  return (
    <ProjectSplitLayout project={project} options={metaOptions}>
      <div className="mx-auto flex max-w-3xl flex-col px-4 py-6 lg:px-6">
        <ProjectActivity
          projectId={project.id}
          currentUserId={currentUserId}
          refreshKey={
            typeof project.updatedAt === "string"
              ? project.updatedAt
              : project.updatedAt.toISOString()
          }
        />
      </div>
    </ProjectSplitLayout>
  )
}
