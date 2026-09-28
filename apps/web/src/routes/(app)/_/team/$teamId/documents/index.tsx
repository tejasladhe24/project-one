import { createFileRoute } from "@tanstack/react-router"
import { TeamDocumentsTable } from "@/components/team/team-documents-table"
import { TeamHomeShell } from "@/components/team/team-home-shell"
import { listTeamDocuments } from "@/lib/documents"
import { listIssueOptions } from "@/lib/issues"
import { listProjectOptions } from "@/lib/projects"

export const Route = createFileRoute("/(app)/_/team/$teamId/documents/")({
  loader: async ({ params, context }) => {
    const team = context.team
    const [documents, projects, issues] = await Promise.all([
      listTeamDocuments({ data: { teamId: params.teamId } }),
      listProjectOptions(),
      listIssueOptions({ data: { teamId: params.teamId } }),
    ])
    return {
      team,
      documents,
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      issues: issues.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        identifier: i.identifier ?? "ISS",
      })),
    }
  },
  component: TeamDocumentsPage,
})

function TeamDocumentsPage() {
  const { team, documents, projects, issues } = Route.useLoaderData()
  const { teamId } = Route.useParams()

  return (
    <TeamHomeShell
      teamId={teamId}
      teamName={team.name}
      teamIdentifier={team.identifier}
      activeTab="documents"
    >
      <TeamDocumentsTable
        teamId={teamId}
        documents={documents}
        projects={projects}
        issues={issues}
      />
    </TeamHomeShell>
  )
}
