import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import {
  IconBan,
  IconClock,
  IconLink,
  IconSquarePlus,
  IconSquareX,
  IconStar,
} from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"
import { IssueView } from "@/components/issue/issue-view"
import type { IssueMetadataValue } from "@/components/issue/issue-metadata-fields"
import { formatRelativeTime } from "@/components/team/team-documents-table"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { formatIssueKey, getInitials } from "@/lib/issues/meta"
import { updateIssue } from "@/lib/issues"
import { getSession } from "@/lib/auth/session"

export type TriageIssue = {
  id: string
  number: number
  title: string
  description: string | null
  priority: number | null
  createdAt: Date | string
  updatedAt: Date | string
  teamIdentifier: string | null
  statusId: string | null
  statusName: string | null
  statusCategory: string | null
  statusSortOrder: number | null
  projectId: string | null
  projectName: string | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeImage: string | null
  labels: { id: string; name: string }[]
  cycleNumber?: number | null
  cyclesEnabled?: boolean
  cycleDurationWeeks?: number
  cycleStartDay?: number
  cyclesOrigin?: Date | string | null
}

export type TriageStatus = {
  id: string
  name: string
  category: string
  sortOrder: number
  isDefault: boolean
}

type TeamTriageViewProps = {
  teamId: string
  teamName: string
  issues: TriageIssue[]
  selectedId: string | null
  statuses: TriageStatus[]
  members: { userId: string; name: string; image: string | null }[]
  projects: { id: string; name: string }[]
  labels: { id: string; name: string }[]
}

function pickStatusId(
  statuses: TriageStatus[],
  action: "accept" | "decline" | "duplicate"
) {
  if (action === "accept") {
    return (
      statuses.find((s) => s.isDefault)?.id ??
      statuses.find((s) => s.category === "backlog")?.id ??
      statuses.find((s) => s.category === "unstarted")?.id ??
      null
    )
  }
  if (action === "decline") {
    return statuses.find((s) => s.category === "canceled")?.id ?? null
  }
  return statuses.find((s) => s.category === "duplicate")?.id ?? null
}

function triageIssueUrl(teamId: string, issueId: string) {
  const url = new URL(
    `/team/${teamId}/triage`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  )
  url.searchParams.set("issue", issueId)
  return url.toString()
}

function TriageIssueRow({
  teamId,
  issue,
  active,
  statuses,
  onMoved,
}: {
  teamId: string
  issue: TriageIssue
  active: boolean
  statuses: TriageStatus[]
  onMoved: (issueId: string) => void
}) {
  const { mutate, pending: busy } = useServerMutation()

  async function moveIssue(action: "accept" | "decline" | "duplicate") {
    const statusId = pickStatusId(statuses, action)
    if (!statusId) {
      toast.error(`No ${action} status configured for this team`)
      return
    }
    const label =
      action === "accept"
        ? "Accepted"
        : action === "decline"
          ? "Declined"
          : "Marked as duplicate"
    try {
      await mutate(
        () =>
          updateIssue({
            data: { teamId, issueId: issue.id, statusId },
          }),
        {
          successMessage: `${label} ${formatIssueKey(issue.teamIdentifier, issue.number)}`,
          errorMessage: "Failed to update issue",
          invalidate: false,
        }
      )
      onMoved(issue.id)
    } catch {
      // toast handled by useServerMutation
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(triageIssueUrl(teamId, issue.id))
      toast.success("URL copied")
    } catch {
      toast.error("Could not copy URL")
    }
  }

  function snooze(label: string) {
    toast.message(`Snooze (${label}) coming soon`)
  }

  const menuIconClass =
    "size-5 text-muted-foreground group-focus/context-menu-item:text-foreground"
  const menuItemClass = "focus:*:[svg]:text-foreground"

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Link
            to="/team/$teamId/triage"
            params={{ teamId }}
            search={{ issue: issue.id }}
            className={cn(
              "block px-4 py-3 transition-colors hover:bg-muted/50",
              active && "bg-muted",
              busy && "pointer-events-none opacity-60"
            )}
          />
        }
      >
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-sm font-medium">{issue.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatIssueKey(issue.teamIdentifier, issue.number)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {issue.assigneeName ? (
            <>
              <Avatar className="size-5">
                {issue.assigneeImage ? (
                  <AvatarImage
                    src={issue.assigneeImage}
                    alt={issue.assigneeName}
                  />
                ) : null}
                <AvatarFallback className="text-[9px]">
                  {getInitials(issue.assigneeName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground">
                {issue.assigneeName.split(" ")[0]}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(issue.updatedAt)}
          </span>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-52 p-2">
        <ContextMenuGroup>
          <ContextMenuItem
            className={menuItemClass}
            disabled={busy}
            onClick={() => void moveIssue("accept")}
          >
            <IconSquarePlus className={menuIconClass} />
            Accept…
            <ContextMenuShortcut>1</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            disabled={busy}
            onClick={() => void moveIssue("decline")}
          >
            <IconSquareX className={menuIconClass} />
            Decline…
            <ContextMenuShortcut>2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            disabled={busy}
            onClick={() => void moveIssue("duplicate")}
          >
            <IconBan className={menuIconClass} />
            Mark as duplicate…
            <ContextMenuShortcut>3</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger className="[&_svg]:size-5 [&_svg]:text-muted-foreground focus:[&_svg]:text-foreground data-open:[&_svg]:text-foreground">
              <IconClock />
              Snooze
              <ContextMenuShortcut className="mr-1">H</ContextMenuShortcut>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-40">
              <ContextMenuItem onClick={() => snooze("Later today")}>
                Later today
              </ContextMenuItem>
              <ContextMenuItem onClick={() => snooze("Tomorrow")}>
                Tomorrow
              </ContextMenuItem>
              <ContextMenuItem onClick={() => snooze("Next week")}>
                Next week
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem
            className={menuItemClass}
            disabled={busy}
            onClick={() => void copyUrl()}
          >
            <IconLink className={menuIconClass} />
            Copy URL
            <ContextMenuShortcut>⌘⇧,</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function TeamTriageView({
  teamId,
  teamName,
  issues: issuesProp,
  selectedId,
  statuses,
  members,
  projects,
  labels,
}: TeamTriageViewProps) {
  const router = useRouter()
  const [issues, setIssues] = React.useState(issuesProp)
  const selected =
    issues.find((issue) => issue.id === selectedId) ?? issues[0] ?? null
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setIssues(issuesProp)
  }, [issuesProp])

  React.useEffect(() => {
    void getSession().then((session) => {
      setCurrentUserId(session?.user.id ?? null)
    })
  }, [])

  function handleIssueMoved(movedId: string) {
    const remaining = issues.filter((i) => i.id !== movedId)
    setIssues(remaining)
    const nextId = remaining[0]?.id
    void router.invalidate().then(() => {
      if (nextId) {
        void router.navigate({
          to: "/team/$teamId/triage",
          params: { teamId },
          search: { issue: nextId },
          replace: true,
        })
      } else {
        void router.navigate({
          to: "/team/$teamId/triage",
          params: { teamId },
          search: {},
          replace: true,
        })
      }
    })
  }

  function handleMetadataUpdated(next: IssueMetadataValue) {
    if (next.statusCategory !== "triage") {
      handleIssueMoved(next.id)
      return
    }
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === next.id
          ? {
              ...issue,
              statusId: next.statusId,
              statusName: next.statusName,
              statusCategory: next.statusCategory,
              statusSortOrder: next.statusSortOrder ?? null,
              priority: next.priority,
              assigneeId: next.assigneeId,
              assigneeName: next.assigneeName,
              assigneeImage: next.assigneeImage,
              projectId: next.projectId,
              projectName: next.projectName,
              labels: next.labels,
            }
          : issue
      )
    )
  }

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize="30" minSize="20" className="min-w-0">
          <div className="flex h-full min-h-0 flex-col border-r">
            <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
              <h1 className="text-base font-semibold tracking-tight">Triage</h1>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled
                aria-label="Favorite"
              >
                <IconStar />
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {teamName}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {issues.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No issues in triage.
                </div>
              ) : (
                <ul className="divide-y">
                  {issues.map((issue) => (
                    <li key={issue.id}>
                      <TriageIssueRow
                        teamId={teamId}
                        issue={issue}
                        active={selected?.id === issue.id}
                        statuses={statuses}
                        onMoved={handleIssueMoved}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="70" minSize="40" className="min-w-0">
          {selected ? (
            <IssueView
              issue={{
                id: selected.id,
                number: selected.number,
                title: selected.title,
                description: selected.description,
                priority: selected.priority,
                teamId,
                teamIdentifier: selected.teamIdentifier,
                statusId: selected.statusId,
                statusName: selected.statusName,
                statusCategory: selected.statusCategory,
                statusSortOrder: selected.statusSortOrder,
                projectId: selected.projectId,
                projectName: selected.projectName,
                assigneeId: selected.assigneeId,
                assigneeName: selected.assigneeName,
                assigneeImage: selected.assigneeImage,
                labels: selected.labels,
                cycleNumber: selected.cycleNumber ?? null,
                cyclesEnabled: selected.cyclesEnabled,
                cycleDurationWeeks: selected.cycleDurationWeeks,
                cycleStartDay: selected.cycleStartDay,
                cyclesOrigin: selected.cyclesOrigin,
              }}
              currentUserId={currentUserId}
              statuses={statuses}
              members={members}
              projects={projects}
              labels={labels}
              onUpdated={handleMetadataUpdated}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a triage issue to view details.
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
