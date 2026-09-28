import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"

export const Route = createFileRoute(
  "/(app)/_/team/$teamId/settings/templates"
)({
  loader: async ({ context }) => {
    const team = context.team
    return { team }
  },
  component: TeamTemplatesPage,
})

function TeamTemplatesPage() {
  const { team } = Route.useLoaderData()
  const { teamId } = Route.useParams()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 lg:px-6">
      <div>
        <Link
          to="/team/$teamId/settings"
          params={{ teamId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {team.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Team templates
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Templates created here are specific to this team.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Issue templates</h2>
        <div className="flex items-center justify-between rounded-lg border px-4 py-6">
          <span className="text-sm text-muted-foreground">
            No issue templates
          </span>
          <Button variant="ghost" size="sm" disabled>
            + New template
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Project templates</h2>
        <div className="flex items-center justify-between rounded-lg border px-4 py-6">
          <span className="text-sm text-muted-foreground">
            No project templates
          </span>
          <Button variant="ghost" size="sm" disabled>
            + New template
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Document templates</h2>
        <div className="flex items-center justify-between rounded-lg border px-4 py-6">
          <span className="text-sm text-muted-foreground">
            No document templates
          </span>
          <Button variant="ghost" size="sm" disabled>
            + New template
          </Button>
        </div>
      </section>
    </div>
  )
}
