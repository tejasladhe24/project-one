import { createFileRoute, Outlet } from "@tanstack/react-router"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings")({
  head: () => pageMeta({ title: "Team settings", noIndex: true }),
  component: TeamSettingsLayout,
})

function TeamSettingsLayout() {
  return <Outlet />
}
