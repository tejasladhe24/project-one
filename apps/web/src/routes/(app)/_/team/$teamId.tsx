import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { pageMeta } from "@/lib/seo"
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
  loader: ({ context }) => ({ team: context.team }),
  head: ({ loaderData }) =>
    pageMeta({
      title: loaderData?.team?.name ?? "Team",
      noIndex: true,
    }),
  component: TeamLayout,
})

function TeamLayout() {
  return <Outlet />
}
