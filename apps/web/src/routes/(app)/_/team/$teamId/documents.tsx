import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/_/team/$teamId/documents")({
  component: TeamDocumentsLayout,
})

function TeamDocumentsLayout() {
  return <Outlet />
}
