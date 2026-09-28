import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(auth)/_")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex min-h-svh p-6">
      <Outlet />
    </div>
  )
}
