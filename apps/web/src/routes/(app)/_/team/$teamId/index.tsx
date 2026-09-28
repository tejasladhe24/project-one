import * as React from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { MarkdownEditor } from "@/components/markdown-editor"
import { TeamHomeShell } from "@/components/team/team-home-shell"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { listTeamDocuments } from "@/lib/documents"
import { listTeamMembersDetailed, updateTeamSettings } from "@/lib/teams"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { buttonVariants } from "@workspace/ui/components/button"

export const Route = createFileRoute("/(app)/_/team/$teamId/")({
  loader: async ({ params, context }) => {
    const team = context.team
    const [members, documents] = await Promise.all([
      listTeamMembersDetailed({ data: { teamId: params.teamId } }),
      listTeamDocuments({ data: { teamId: params.teamId } }),
    ])
    return {
      team,
      members: members.slice(0, 3).map((m) => ({
        userId: m.userId,
        name: m.name,
        image: m.image,
      })),
      memberCount: members.length,
      documentCount: documents.length,
    }
  },
  component: TeamOverviewPage,
})

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

function TeamOverviewPage() {
  const { team, members, memberCount, documentCount } = Route.useLoaderData()
  const { teamId } = Route.useParams()
  const { mutate, pending: saving } = useServerMutation()
  const [description, setDescription] = React.useState(team.description ?? "")

  React.useEffect(() => {
    setDescription(team.description ?? "")
  }, [team.description])

  async function saveDescription() {
    const next = description.trim()
    const prev = (team.description ?? "").trim()
    if (next === prev) return
    try {
      await mutate(
        () =>
          updateTeamSettings({
            data: { teamId, description: next || null },
          }),
        { errorMessage: "Could not save description" }
      )
    } catch {
      // toast handled by useServerMutation
    }
  }

  return (
    <TeamHomeShell
      teamId={teamId}
      teamName={team.name}
      teamIdentifier={team.identifier}
      activeTab="overview"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_auto_14rem] lg:items-stretch">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {team.name}
            </h2>
            <MarkdownEditor
              variant="compact"
              value={description}
              onChange={setDescription}
              onBlur={() => void saveDescription()}
              placeholder="Add a description…"
              disabled={saving}
              className="mt-3"
            />
          </div>

          <Separator />

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Team resources
              </h3>
              <Link
                to="/team/$teamId/documents"
                params={{ teamId }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                View documents
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {documentCount === 0
                ? "Add documents and links. Organize work for this team."
                : `${documentCount} document${documentCount === 1 ? "" : "s"} on this team.`}
            </p>
          </section>
        </div>

        <Separator
          orientation="vertical"
          className="hidden h-full min-h-40 lg:block"
        />

        <aside className="flex flex-col gap-6">
          <section>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Members
            </h3>
            <Link
              to="/team/$teamId/settings/members"
              params={{ teamId }}
              className="flex items-center gap-2"
            >
              <div className="flex -space-x-2">
                {members.map((m) => (
                  <Avatar
                    key={m.userId}
                    className="size-7 border-2 border-background"
                  >
                    {m.image ? (
                      <AvatarImage src={m.image} alt={m.name} />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {memberCount > members.length ? (
                <span className="text-sm text-muted-foreground">
                  +{memberCount - members.length} member
                  {memberCount - members.length === 1 ? "" : "s"}
                </span>
              ) : memberCount > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </Link>
          </section>

          <Separator />

          <section className="flex flex-col gap-2">
            <h3 className="ml-2 text-xs text-muted-foreground">Go To</h3>
            <ul className="flex flex-col text-sm">
              <li>
                <Link
                  to="/team/$teamId/settings"
                  params={{ teamId }}
                  className={cn(buttonVariants({ variant: "link" }))}
                >
                  Team settings
                </Link>
              </li>
              <li>
                <Link
                  to="/issues"
                  search={{ team_id: teamId }}
                  className={cn(buttonVariants({ variant: "link" }))}
                >
                  Issues
                </Link>
              </li>
              <li>
                <Link
                  to="/team/$teamId/documents"
                  params={{ teamId }}
                  className={cn(buttonVariants({ variant: "link" }))}
                >
                  Documents
                </Link>
              </li>
              <li>
                <Link
                  to="/team/$teamId/projects"
                  params={{ teamId }}
                  className={cn(buttonVariants({ variant: "link" }))}
                >
                  Projects
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </TeamHomeShell>
  )
}
