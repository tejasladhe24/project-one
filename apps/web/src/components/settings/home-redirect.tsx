import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { homeViewPath, readPreferences } from "@/lib/preferences"

export function HomeRedirect() {
  const navigate = useNavigate()

  React.useEffect(() => {
    const view = readPreferences().defaultHomeView
    void navigate({ to: homeViewPath(view), replace: true })
  }, [navigate])

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  )
}
