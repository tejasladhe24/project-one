import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getTeam } from "@/lib/teams"

export const Route = createFileRoute("/(app)/_/team/$teamId")({
  beforeLoad: async ({ params }) => {
    try {
      const team = await getTeam({ data: { teamId: params.teamId } })
      return { team }
    } catch {
      throw redirect({ to: "/teams" })
    }
  },
  component: TeamLayout,
})

function TeamLayout() {
  return <Outlet />
}
