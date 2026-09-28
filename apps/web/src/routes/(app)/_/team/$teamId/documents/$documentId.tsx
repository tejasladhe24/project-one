import * as React from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { IconArrowLeft, IconFileText } from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Input } from "@workspace/ui/components/input"
import { formatRelativeTime } from "@/components/team/team-documents-table"
import { MarkdownEditor } from "@/components/markdown-editor"
import { TeamHomeShell } from "@/components/team/team-home-shell"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { getTeamDocument, updateTeamDocument } from "@/lib/documents"

export const Route = createFileRoute(
  "/(app)/_/team/$teamId/documents/$documentId"
)({
  loader: async ({ params, context }) => {
    const team = context.team
    const [document] = await Promise.all([
      getTeamDocument({
        data: { teamId: params.teamId, documentId: params.documentId },
      }),
    ])
    return { team, document }
  },
  component: TeamDocumentPage,
})

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

function TeamDocumentPage() {
  const { team, document } = Route.useLoaderData()
  const { teamId } = Route.useParams()
  const { mutate, pending: saving } = useServerMutation()
  const [title, setTitle] = React.useState(document.title)
  const [content, setContent] = React.useState(document.content ?? "")

  React.useEffect(() => {
    setTitle(document.title)
    setContent(document.content ?? "")
  }, [document.title, document.content])

  async function persist(patch: { title?: string; content?: string | null }) {
    try {
      await mutate(
        () =>
          updateTeamDocument({
            data: {
              teamId,
              documentId: document.id,
              ...patch,
            },
          }),
        { errorMessage: "Could not save document" }
      )
    } catch {
      // toast handled by useServerMutation
    }
  }

  const issueLabel =
    document.issueNumber != null
      ? `${document.teamIdentifier ?? "ISS"}-${String(document.issueNumber).padStart(3, "0")}`
      : null

  return (
    <TeamHomeShell
      teamId={teamId}
      teamName={team.name}
      teamIdentifier={team.identifier}
      activeTab="documents"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-2">
          <Link
            to="/team/$teamId/documents"
            params={{ teamId }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="size-4" />
            Documents
          </Link>
          {saving ? (
            <span className="text-xs text-muted-foreground">Saving…</span>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <IconFileText className="mt-2 size-6 shrink-0 text-muted-foreground" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const next = title.trim()
              if (!next || next === document.title) {
                setTitle(document.title)
                return
              }
              void persist({ title: next })
            }}
            className="h-auto border-transparent bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>

        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Team</dt>
            <dd className="mt-0.5 font-medium">{document.teamName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Project</dt>
            <dd className="mt-0.5 font-medium">
              {document.projectName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Issue</dt>
            <dd className="mt-0.5 font-medium">
              {issueLabel
                ? `${issueLabel}${document.issueTitle ? ` · ${document.issueTitle}` : ""}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="mt-0.5 flex items-center gap-2 font-medium">
              {document.ownerName ? (
                <>
                  <Avatar className="size-5">
                    {document.ownerImage ? (
                      <AvatarImage
                        src={document.ownerImage}
                        alt={document.ownerName}
                      />
                    ) : null}
                    <AvatarFallback className="text-[9px]">
                      {getInitials(document.ownerName)}
                    </AvatarFallback>
                  </Avatar>
                  {document.ownerName}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-0.5 font-medium">
              {formatRelativeTime(document.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last edited</dt>
            <dd className="mt-0.5 font-medium">
              {formatRelativeTime(document.updatedAt)}
            </dd>
          </div>
        </dl>

        <MarkdownEditor
          value={content}
          onChange={setContent}
          onBlur={() => {
            const next = content
            const prev = document.content ?? ""
            if (next === prev) return
            void persist({ content: next || null })
          }}
          placeholder="Start writing…"
        />
      </div>
    </TeamHomeShell>
  )
}
