import { createFileRoute } from "@tanstack/react-router"
import { HomeRedirect } from "@/components/settings/home-redirect"

export const Route = createFileRoute("/(app)/_/")({
  component: HomeRedirect,
})
