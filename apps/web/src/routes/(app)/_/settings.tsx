import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/_/settings")({
  component: SettingsLayout,
})

function SettingsLayout() {
  return <Outlet />
}
