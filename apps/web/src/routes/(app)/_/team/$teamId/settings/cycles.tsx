import { createFileRoute } from "@tanstack/react-router"
import { TeamCyclesSettings } from "@/components/teams/team-cycles-settings"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/cycles")({
  loader: async ({ context }) => {
    const team = context.team
    return { team }
  },
  component: TeamCyclesSettingsPage,
})

function TeamCyclesSettingsPage() {
  const { team } = Route.useLoaderData()

  return (
    <TeamCyclesSettings
      teamId={team.id}
      teamName={team.name}
      cyclesEnabled={team.cyclesEnabled}
      cycleDurationWeeks={team.cycleDurationWeeks}
      cycleStartDay={team.cycleStartDay}
      cyclesOrigin={team.cyclesOrigin}
    />
  )
}
