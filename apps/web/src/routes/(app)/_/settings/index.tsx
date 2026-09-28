import { createFileRoute, Link } from "@tanstack/react-router"
import { IconChevronRight, IconKey } from "@tabler/icons-react"
import { listMcpApiKeys } from "@/lib/mcp/keys"

export const Route = createFileRoute("/(app)/_/settings/")({
  loader: async () => {
    const keys = await listMcpApiKeys()
    return { keyCount: keys.length }
  },
  component: SettingsIndexPage,
})

function SettingsIndexPage() {
  const { keyCount } = Route.useLoaderData()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization settings for the active workspace.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Link
          to="/settings/mcp"
          className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <IconKey className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">API Keys</div>
            <div className="truncate text-xs text-muted-foreground">
              Create and manage API keys for the active organization
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {keyCount} key{keyCount === 1 ? "" : "s"}
          </span>
          <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  )
}
