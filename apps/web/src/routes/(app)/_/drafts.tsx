import { createFileRoute } from "@tanstack/react-router"
import { DraftsTable } from "@/components/drafts/drafts-table"
import { listUserTeams } from "@/lib/auth/session"
import { listProjectOptions } from "@/lib/projects"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/drafts")({
  loader: async ({ context }) => {
    const organizationId = context.session.session.activeOrganizationId
    if (!organizationId) {
      throw new Error("No active organization")
    }

    const [projects, teams] = await Promise.all([
      listProjectOptions(),
      listUserTeams(),
    ])

    return {
      organizationId,
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
  head: () => pageMeta({ title: "Drafts", noIndex: true }),
  component: DraftsPage,
})

function DraftsPage() {
  const { organizationId, projects, teams } = Route.useLoaderData()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <DraftsTable
        organizationId={organizationId}
        projects={projects}
        teams={teams}
      />
    </div>
  )
}
