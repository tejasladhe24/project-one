import { createFileRoute } from "@tanstack/react-router"
import { TeamSettingsHub } from "@/components/teams/team-settings-hub"
import { pageMeta } from "@/lib/seo"
import { getTeamSettingsSummary } from "@/lib/teams"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/")({
  loader: async ({ params }) => {
    const summary = await getTeamSettingsSummary({
      data: { teamId: params.teamId },
    })
    return { summary }
  },
  head: () => pageMeta({ title: "Team settings", noIndex: true }),
  component: TeamSettingsIndexPage,
})

function TeamSettingsIndexPage() {
  const { summary } = Route.useLoaderData()
  const { teamId } = Route.useParams()

  return (
    <TeamSettingsHub
      teamId={teamId}
      teamName={summary.name}
      memberCount={summary.memberCount}
      labelCount={summary.labelCount}
      statusCount={summary.statusCount}
      templateCount={summary.templateCount}
    />
  )
}
