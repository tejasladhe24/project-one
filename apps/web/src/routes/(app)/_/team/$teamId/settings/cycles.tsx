import { createFileRoute } from "@tanstack/react-router"
import { TeamCyclesSettings } from "@/components/teams/team-cycles-settings"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/cycles")({
  loader: async ({ context }) => {
    const team = context.team
    return { team }
  },
  head: ({ loaderData }) =>
    pageMeta({
      title: loaderData?.team?.name
        ? `Cycles · ${loaderData.team.name}`
        : "Cycles",
      noIndex: true,
    }),
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
