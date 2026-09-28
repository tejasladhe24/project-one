import { createFileRoute, Link } from "@tanstack/react-router"
import {
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconKey,
  IconUser,
} from "@tabler/icons-react"
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal and organization settings.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          General
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            <Link
              to="/settings/preferences"
              className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <IconAdjustmentsHorizontal className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Preferences</div>
                <div className="truncate text-xs text-muted-foreground">
                  Home view, display names, theme, and more
                </div>
              </div>
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              to="/settings/profile"
              className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <IconUser className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Profile</div>
                <div className="truncate text-xs text-muted-foreground">
                  Name, email, username, and profile picture
                </div>
              </div>
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Developers
        </h2>
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
      </section>
    </div>
  )
}
