import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { McpApiKeysTable } from "@/components/settings/mcp-api-keys-table"
import { listMcpApiKeys } from "@/lib/mcp/keys"

export const Route = createFileRoute("/(app)/_/settings/mcp")({
  loader: async () => {
    const keys = await listMcpApiKeys()
    return { keys }
  },
  component: McpSettingsPage,
})

function McpSettingsPage() {
  const { keys } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <Link
          to="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Settings
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage API keys for the active organization.
          </p>
        </div>
      </div>

      <McpApiKeysTable
        data={keys}
        onChanged={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
