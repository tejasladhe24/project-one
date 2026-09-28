import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import {
  IconBackspace,
  IconCircleDot,
  IconClipboard,
  IconClock,
  IconExternalLink,
  IconGitPullRequest,
  IconStar,
  IconUsersGroup,
} from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
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
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"
import { IssueView } from "@/components/issue/issue-view"
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  deleteInboxNotification,
  getInboxIssueDetail,
  markInboxNotificationRead,
  markInboxNotificationUnread,
} from "@/lib/inbox"
import { getInitials } from "@/lib/issues/meta"
import { getSession } from "@/lib/auth/session"
import { acceptTeamJoinRequest } from "@/lib/teams"

export type InboxNotificationItem = {
  id: string
  type: "issue" | "review" | "team"
  title: string
  body: string
  isPriority: boolean
  readAt: Date | string | null
  createdAt: Date | string
  issueId: string | null
  teamId: string | null
  teamName: string | null
  teamIdentifier: string | null
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  actorImage: string | null
  requesterIsMember: boolean
}

type InboxIssueDetail = Awaited<ReturnType<typeof getInboxIssueDetail>>

type InboxViewProps = {
  notifications: InboxNotificationItem[]
  selectedId: string | null
}

const menuIconClass =
  "size-5 text-muted-foreground group-focus/context-menu-item:text-foreground"
const menuItemClass = "focus:*:[svg]:text-foreground"
const subTriggerClass =
  "[&_svg]:size-5 [&_svg]:text-muted-foreground focus:[&_svg]:text-foreground data-open:[&_svg]:text-foreground"

function shortAge(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function inboxItemUrl(item: InboxNotificationItem) {
  const url = new URL(
    "/inbox",
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  )
  url.searchParams.set("n", item.id)
  return url.toString()
}

function ReviewDetail({ notification }: { notification: InboxNotificationItem }) {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconGitPullRequest className="size-5" />
        <span className="text-xs font-medium tracking-wide uppercase">
          Pull request review
        </span>
      </div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight">
        {notification.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{notification.body}</p>
      <Separator className="my-6" />
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Review detail view is a placeholder for now. Diffs and approve/request
        changes will land here later.
      </div>
    </div>
  )
}

function TeamJoinRequestDetail({
  notification,
}: {
  notification: InboxNotificationItem
}) {
  const { mutate, pending } = useServerMutation()
  const [accepted, setAccepted] = React.useState(
    notification.requesterIsMember
  )

  React.useEffect(() => {
    setAccepted(notification.requesterIsMember)
  }, [notification.id, notification.requesterIsMember])

  const teamName = notification.teamName ?? "Unknown team"
  const teamIdentifier = notification.teamIdentifier
  const requesterName = notification.actorName ?? "Unknown user"
  const requesterEmail = notification.actorEmail
  const canAccept =
    Boolean(notification.teamId && notification.actorId) && !accepted

  async function handleAccept() {
    if (!notification.teamId || !notification.actorId) return
    try {
      await mutate(
        () =>
          acceptTeamJoinRequest({
            data: {
              teamId: notification.teamId!,
              userId: notification.actorId!,
              notificationId: notification.id,
            },
          }),
        {
          successMessage: `${requesterName} added to ${teamName}`,
          errorMessage: "Could not accept request",
        }
      )
      setAccepted(true)
    } catch {
      // toast handled by useServerMutation
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconUsersGroup className="size-5" />
        <span className="text-xs font-medium tracking-wide uppercase">
          Team join request
        </span>
      </div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight">
        {notification.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{notification.body}</p>

      <Separator className="my-6" />

      <div className="flex max-w-md flex-col gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Requesting user
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="size-10">
              {notification.actorImage ? (
                <AvatarImage
                  src={notification.actorImage}
                  alt={requesterName}
                />
              ) : null}
              <AvatarFallback className="text-xs">
                {getInitials(requesterName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{requesterName}</p>
              {requesterEmail ? (
                <p className="truncate text-sm text-muted-foreground">
                  {requesterEmail}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Team
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <IconUsersGroup className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{teamName}</p>
              {teamIdentifier ? (
                <p className="truncate text-sm text-muted-foreground">
                  {teamIdentifier}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {accepted ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {requesterName} is a member of {teamName}.
            </p>
            {notification.teamId ? (
              <Button
                variant="outline"
                className="w-fit"
                render={
                  <Link
                    to="/team/$teamId/settings/members"
                    params={{ teamId: notification.teamId }}
                  />
                }
                nativeButton={false}
              >
                Go to team members
              </Button>
            ) : null}
          </div>
        ) : (
          <Button
            className="w-fit"
            disabled={!canAccept || pending}
            onClick={() => void handleAccept()}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Adding…" : "Accept request"}
          </Button>
        )}
      </div>
    </div>
  )
}

function InboxNotificationRow({
  item,
  active,
  onDeleted,
}: {
  item: InboxNotificationItem
  active: boolean
  onDeleted: (id: string) => void
}) {
  const { mutate, pending: busy } = useServerMutation()
  const isUnread = item.readAt == null

  async function markUnread() {
    try {
      await mutate(
        () => markInboxNotificationUnread({ data: { id: item.id } }),
        {
          successMessage: "Marked as unread",
          errorMessage: "Failed to update",
        }
      )
    } catch {
      // toast handled by useServerMutation
    }
  }

  async function remove() {
    try {
      await mutate(
        () => deleteInboxNotification({ data: { id: item.id } }),
        {
          successMessage: "Notification deleted",
          errorMessage: "Failed to delete",
          invalidate: false,
        }
      )
      onDeleted(item.id)
    } catch {
      // toast handled by useServerMutation
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inboxItemUrl(item))
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  async function copyTitle() {
    try {
      await navigator.clipboard.writeText(item.title)
      toast.success("Title copied")
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Link
            to="/inbox"
            search={{ n: item.id }}
            className={cn(
              "block px-4 py-3 transition-colors hover:bg-muted/50",
              active && "bg-muted",
              busy && "pointer-events-none opacity-60"
            )}
          />
        }
      >
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5 size-7 shrink-0">
            {item.actorImage ? (
              <AvatarImage src={item.actorImage} alt={item.actorName ?? ""} />
            ) : null}
            <AvatarFallback className="text-[9px]">
              {item.type === "review" ? (
                <IconGitPullRequest className="size-3.5" />
              ) : item.type === "team" ? (
                <IconUsersGroup className="size-3.5" />
              ) : (
                getInitials(item.actorName ?? "?")
              )}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "line-clamp-1 text-sm font-medium",
                  isUnread ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.title}
              </p>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  isUnread ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {shortAge(item.createdAt)}
              </span>
            </div>
            <p
              className={cn(
                "mt-0.5 line-clamp-1 text-xs",
                isUnread ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.body}
            </p>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-56 p-2">
        <ContextMenuGroup>
          <ContextMenuItem
            className={menuItemClass}
            disabled={busy || isUnread}
            onClick={() => void markUnread()}
          >
            <IconCircleDot className={menuIconClass} />
            Mark as unread
            <ContextMenuShortcut>U</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            disabled={busy}
            onClick={() => void remove()}
          >
            <IconBackspace className={menuIconClass} />
            Delete notification
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger className={subTriggerClass}>
              <IconClock />
              Snooze
              <ContextMenuShortcut className="mr-1">H</ContextMenuShortcut>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-40">
              <ContextMenuItem
                onClick={() =>
                  toast.message("Snooze (Later today) coming soon")
                }
              >
                Later today
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => toast.message("Snooze (Tomorrow) coming soon")}
              >
                Tomorrow
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => toast.message("Snooze (Next week) coming soon")}
              >
                Next week
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuItem
            className={menuItemClass}
            onClick={() => toast.message("Favorites coming soon")}
          >
            <IconStar className={menuIconClass} />
            Favorite
            <ContextMenuShortcut>⌥F</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger className={subTriggerClass}>
              <IconClipboard />
              Copy
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-40">
              <ContextMenuItem onClick={() => void copyLink()}>
                Copy link
              </ContextMenuItem>
              <ContextMenuItem onClick={() => void copyTitle()}>
                Copy title
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuItem
            className={menuItemClass}
            onClick={() => toast.message("Desktop app opening coming soon")}
          >
            <IconExternalLink className={menuIconClass} />
            Open in desktop app
            <ContextMenuShortcut>⌃⌘,</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function InboxView({ notifications, selectedId }: InboxViewProps) {
  const router = useRouter()
  const [tab, setTab] = React.useState<"priority" | "other">("priority")
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [issueDetail, setIssueDetail] = React.useState<InboxIssueDetail | null>(
    null
  )
  const [loadingIssue, setLoadingIssue] = React.useState(false)

  const priorityItems = notifications.filter((n) => n.isPriority)
  const otherItems = notifications.filter((n) => !n.isPriority)
  const list = tab === "priority" ? priorityItems : otherItems

  const selected =
    list.find((n) => n.id === selectedId) ??
    notifications.find((n) => n.id === selectedId) ??
    list[0] ??
    null

  React.useEffect(() => {
    void getSession().then((session) => {
      setCurrentUserId(session?.user.id ?? null)
    })
  }, [])

  React.useEffect(() => {
    if (!selected?.issueId || selected.type !== "issue") {
      setIssueDetail(null)
      return
    }
    let cancelled = false
    setLoadingIssue(true)
    void getInboxIssueDetail({ data: { issueId: selected.issueId } })
      .then((detail) => {
        if (!cancelled) setIssueDetail(detail)
      })
      .catch(() => {
        if (!cancelled) setIssueDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingIssue(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected?.id, selected?.issueId, selected?.type])

  // Mark read only when the user selects a different notification — not when
  // they mark the current one unread again.
  React.useEffect(() => {
    if (!selectedId) return
    const item = notifications.find((n) => n.id === selectedId)
    if (!item || item.readAt != null) return
    void markInboxNotificationRead({ data: { id: item.id } }).then(() => {
      void router.invalidate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on selection change
  }, [selectedId])

  function handleDeleted(deletedId: string) {
    const remaining = notifications.filter((n) => n.id !== deletedId)
    const nextId = remaining[0]?.id
    void router.invalidate().then(() => {
      void router.navigate({
        to: "/inbox",
        search: nextId ? { n: nextId } : {},
        replace: true,
      })
    })
  }

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize="32" minSize="22" className="min-w-0">
          <div className="flex h-full min-h-0 flex-col border-r">
            <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={tab === "priority" ? "secondary" : "ghost"}
                  className="h-7 gap-1.5"
                  onClick={() => setTab("priority")}
                >
                  Priority
                  <Badge variant="outline" className="h-5 px-1.5 font-normal">
                    {priorityItems.length > 99 ? "99+" : priorityItems.length}
                  </Badge>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tab === "other" ? "secondary" : "ghost"}
                  className="h-7 gap-1.5"
                  onClick={() => setTab("other")}
                >
                  Other
                  <Badge variant="outline" className="h-5 px-1.5 font-normal">
                    {otherItems.length}
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {list.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No {tab} notifications.
                </div>
              ) : (
                <ul className="divide-y">
                  {list.map((item) => (
                    <li key={item.id}>
                      <InboxNotificationRow
                        item={item}
                        active={selected?.id === item.id}
                        onDeleted={handleDeleted}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="68" minSize="40" className="min-w-0">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a notification to view details.
            </div>
          ) : selected.type === "review" ? (
            <ReviewDetail notification={selected} />
          ) : selected.type === "team" ? (
            <TeamJoinRequestDetail notification={selected} />
          ) : loadingIssue ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading issue…
            </div>
          ) : issueDetail ? (
            <IssueView issue={issueDetail} currentUserId={currentUserId} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Issue not found.
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
