import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings")({
  component: TeamSettingsLayout,
})

function TeamSettingsLayout() {
  return <Outlet />
}
