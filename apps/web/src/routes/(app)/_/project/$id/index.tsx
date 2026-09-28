import * as React from "react"
import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { MarkdownEditor } from "@/components/markdown-editor"
import { ProjectResources } from "@/components/project/project-resources"
import {
  ProjectHero,
  ProjectPropertyPills,
  ProjectSplitLayout,
} from "@/components/project/project-shell"
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  listDocumentsForProjectLink,
  listProjectDocuments,
} from "@/lib/documents"
import { updateProject } from "@/lib/projects"
import { listUserTeams } from "@/lib/auth/session"

const projectRoute = getRouteApi("/(app)/_/project/$id")

export const Route = createFileRoute("/(app)/_/project/$id/")({
  loader: async ({ params }) => {
    const [linkedDocuments, linkableDocuments, userTeams] = await Promise.all([
      listProjectDocuments({ data: { projectId: params.id } }),
      listDocumentsForProjectLink({ data: { projectId: params.id } }),
      listUserTeams(),
    ])

    return {
      linkedDocuments,
      linkableDocuments,
      defaultTeamId: userTeams?.[0]?.id ?? null,
    }
  },
  component: ProjectOverviewPage,
})

function ProjectOverviewPage() {
  const { project, metaOptions } = projectRoute.useLoaderData()
  const { linkedDocuments, linkableDocuments, defaultTeamId } =
    Route.useLoaderData()
  const { mutate, pending: saving } = useServerMutation()
  const [description, setDescription] = React.useState(
    project.description ?? ""
  )

  React.useEffect(() => {
    setDescription(project.description ?? "")
  }, [project.description])

  async function saveDescription() {
    const next = description.trim()
    const prev = (project.description ?? "").trim()
    if (next === prev) return
    try {
      await mutate(
        () =>
          updateProject({
            data: { projectId: project.id, description: next || null },
          }),
        { errorMessage: "Could not save description" }
      )
    } catch {
      // toast handled by useServerMutation
    }
  }

  return (
    <ProjectSplitLayout project={project} options={metaOptions}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
        <ProjectHero project={project} />
        <p className="text-sm text-muted-foreground">
          Add a short summary of this project’s goals and launch plan.
        </p>

        <ProjectPropertyPills project={project} options={metaOptions} />

        <ProjectResources
          projectId={project.id}
          documents={linkedDocuments.map((doc) => ({
            id: doc.id,
            title: doc.title,
            teamId: doc.teamId,
            teamName: doc.teamName,
            teamIdentifier: doc.teamIdentifier,
          }))}
          linkableDocuments={linkableDocuments.map((doc) => ({
            id: doc.id,
            title: doc.title,
            teamId: doc.teamId,
            teamName: doc.teamName,
            teamIdentifier: doc.teamIdentifier,
          }))}
          defaultTeamId={defaultTeamId}
        />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Description
          </h2>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            onBlur={() => void saveDescription()}
            placeholder="No description yet. Write markdown…"
            disabled={saving}
          />
        </section>
      </div>
    </ProjectSplitLayout>
  )
}
