import { createFileRoute } from "@tanstack/react-router"
import { TeamGeneralSettings } from "@/components/teams/team-general-settings"
import { parseEstimateType } from "@/lib/estimates"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/general")({
  loader: async ({ context }) => {
    const team = context.team
    return { team }
  },
  component: TeamGeneralPage,
})

function TeamGeneralPage() {
  const { team } = Route.useLoaderData()

  return (
    <TeamGeneralSettings
      teamId={team.id}
      name={team.name}
      identifier={team.identifier}
      description={team.description}
      estimateType={parseEstimateType(team.estimateType)}
      allowZeroEstimates={team.allowZeroEstimates}
      extendedEstimateScale={team.extendedEstimateScale}
      countUnestimatedIssues={team.countUnestimatedIssues}
    />
  )
}
