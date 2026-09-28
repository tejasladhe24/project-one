import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  IconCircleDot,
  IconFlag,
  IconMessage2Down,
  IconSelector,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { formatRelativeTime } from "@/components/team/team-documents-table"
import { IssueCommentComposer } from "@/components/team/issue-comment-composer"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { createIssueComment, deleteIssueComment } from "@/lib/issues/comments"
import {
  getIssueTimeline,
  listIssueSubscribers,
  setIssueSubscription,
} from "@/lib/issues/issue-activity"
import { getInitials } from "@/lib/issues/meta"

export type IssueCommentRow = {
  id: string
  issueId: string
  parentId: string | null
  body: string
  createdAt: Date | string
  updatedAt: Date | string
  authorId: string
  authorName: string
  authorImage: string | null
}

type ActivityRow = {
  id: string
  issueId: string
  type: string
  message: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: Date | string
  actorId: string | null
  actorName: string | null
  actorImage: string | null
}

type SubscriberRow = {
  userId: string
  name: string
  image: string | null
  reason: string
}

type IssueActivityProps = {
  teamId: string
  issueId: string
  currentUserId?: string | null
  /** Bump to reload timeline after metadata changes. */
  refreshKey?: number
  className?: string
}

const MENTION_RE = /@\[([^\]]+)\]\((user|issue):([^)]+)\)/g

type TimelineItem =
  | { kind: "activity"; at: number; activity: ActivityRow }
  | { kind: "comment"; at: number; comment: IssueCommentRow }

type TimelineSegment =
  | { kind: "comment"; comment: IssueCommentRow }
  | { kind: "activities"; key: string; activities: ActivityRow[] }

const ACTIVITY_COLLAPSE_THRESHOLD = 4

function activityChangeLabel(activity: ActivityRow): string {
  const message = activity.message?.toLowerCase() ?? ""
  switch (activity.type) {
    case "status-change":
      if (message.includes("project")) return "project"
      return "status"
    case "priority-change":
      return "priority"
    case "assignee-change":
      return "assignee"
    case "label-change":
      return "labels"
    case "title-change":
      return "title"
    case "description-change":
      return "description"
    case "due-date-change":
      return "due date"
    case "estimated-hours-change":
      return "estimate"
    case "created":
      return "creation"
    default:
      return "details"
  }
}

function formatChangeList(labels: string[]) {
  if (labels.length === 0) return "details"
  if (labels.length === 1) return labels[0]!
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`
}

function collapsedActivitySummary(activities: ActivityRow[]) {
  const labels: string[] = []
  const seen = new Set<string>()
  for (const activity of activities) {
    const label = activityChangeLabel(activity)
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }
  return `Show ${activities.length} events: changed ${formatChangeList(labels)}…`
}

function groupTimeline(items: TimelineItem[]): TimelineSegment[] {
  const segments: TimelineSegment[] = []
  for (const item of items) {
    if (item.kind === "comment") {
      segments.push({ kind: "comment", comment: item.comment })
      continue
    }
    const last = segments[segments.length - 1]
    if (last?.kind === "activities") {
      last.activities.push(item.activity)
    } else {
      segments.push({
        kind: "activities",
        key: item.activity.id,
        activities: [item.activity],
      })
    }
  }
  return segments
}

function toTime(value: Date | string) {
  return (typeof value === "string" ? new Date(value) : value).getTime()
}

function CommentBody({ body }: { body: string }) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of body.matchAll(MENTION_RE)) {
    const full = match[0]!
    const label = match[1]!
    const type = match[2]!
    const id = match[3]!
    const index = match.index ?? 0

    if (index > lastIndex) {
      parts.push(
        <React.Fragment key={`t-${key++}`}>
          {body.slice(lastIndex, index)}
        </React.Fragment>
      )
    }

    if (type === "user") {
      parts.push(
        <span
          key={`m-${key++}`}
          className="rounded bg-muted px-1 py-0.5 font-medium text-foreground"
        >
          @{label}
        </span>
      )
    } else {
      parts.push(
        <Link
          key={`m-${key++}`}
          to="/issue/$issueId"
          params={{ issueId: id }}
          className="rounded bg-muted px-1 py-0.5 font-medium text-foreground underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      )
    }

    lastIndex = index + full.length
  }

  if (lastIndex < body.length) {
    parts.push(
      <React.Fragment key={`t-${key++}`}>
        {body.slice(lastIndex)}
      </React.Fragment>
    )
  }

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
      {parts}
    </p>
  )
}

function activityIcon(type: string) {
  switch (type) {
    case "status-change":
      return <IconCircleDot className="size-3.5" />
    case "priority-change":
      return <IconFlag className="size-3.5" />
    case "assignee-change":
      return <IconUserPlus className="size-3.5" />
    default:
      return <IconCircleDot className="size-3.5" />
  }
}

function ActivityLogItem({ activity }: { activity: ActivityRow }) {
  const name = activity.actorName ?? "Someone"
  const message = activity.message ?? `${name} updated the issue`

  return (
    <div className="group/activity flex items-start gap-3 py-1.5">
      <Avatar className="mt-0.5 size-6 shrink-0">
        {activity.actorImage ? (
          <AvatarImage src={activity.actorImage} alt={name} />
        ) : null}
        <AvatarFallback className="bg-muted text-[9px] text-muted-foreground">
          {activity.actorId ? getInitials(name) : activityIcon(activity.type)}
        </AvatarFallback>
      </Avatar>
      <p className="min-w-0 flex-1 text-sm text-muted-foreground transition-colors group-hover/activity:text-foreground">
        {message}
        <span>
          {" · "}
          {formatRelativeTime(activity.createdAt)}
        </span>
      </p>
    </div>
  )
}

function CollapsedActivityGroup({
  activities,
  expanded,
  onToggle,
}: {
  activities: ActivityRow[]
  expanded: boolean
  onToggle: () => void
}) {
  if (expanded) {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onToggle}
          className="group/collapse flex items-start gap-3 py-1.5 text-left"
        >
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover/collapse:text-foreground">
            <IconSelector className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 text-sm text-muted-foreground transition-colors group-hover/collapse:text-foreground">
            Hide {activities.length} events
          </span>
        </button>
        {activities.map((activity) => (
          <ActivityLogItem key={activity.id} activity={activity} />
        ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="group/collapse flex items-start gap-3 py-1.5 text-left"
    >
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover/collapse:text-foreground">
        <IconSelector className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 text-sm text-muted-foreground transition-colors group-hover/collapse:text-foreground">
        {collapsedActivitySummary(activities)}
      </span>
    </button>
  )
}

function CommentItem({
  comment,
  teamId,
  issueId,
  depth,
  currentUserId,
  onReply,
  onDeleted,
}: {
  comment: IssueCommentRow
  teamId: string
  issueId: string
  depth: number
  currentUserId?: string | null
  onReply: (parentId: string) => void
  onDeleted: () => void
}) {
  const { mutate, pending: deleting } = useServerMutation()
  const isOwn = currentUserId != null && comment.authorId === currentUserId

  async function handleDelete() {
    if (!isOwn || deleting) return
    try {
      await mutate(
        () =>
          deleteIssueComment({
            data: { teamId, issueId, commentId: comment.id },
          }),
        {
          errorMessage: "Could not delete comment",
          invalidate: false,
        }
      )
      onDeleted()
    } catch {
      // toast handled by useServerMutation
    }
  }

  return (
    <div
      className={cn(
        "group/comment flex gap-3 py-2",
        depth > 0 && "ml-3 border-l pl-4"
      )}
    >
      <Avatar className="mt-0.5 size-7 shrink-0">
        {comment.authorImage ? (
          <AvatarImage src={comment.authorImage} alt={comment.authorName} />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {getInitials(comment.authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">
                {comment.authorName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <div className="mt-1 text-foreground">
              <CommentBody body={comment.body} />
            </div>
          </div>
          {depth === 0 || isOwn ? (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/comment:opacity-100 group-hover/comment:opacity-100">
              {depth === 0 ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => onReply(comment.id)}
                >
                  <IconMessage2Down className="size-4" />
                </Button>
              ) : null}
              {isOwn ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  <IconTrash className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function IssueActivity({
  teamId,
  issueId,
  currentUserId,
  refreshKey = 0,
  className,
}: IssueActivityProps) {
  const { mutate } = useServerMutation()
  const { mutate: mutateSub, pending: subBusy } = useServerMutation()
  const [comments, setComments] = React.useState<IssueCommentRow[]>([])
  const [activities, setActivities] = React.useState<ActivityRow[]>([])
  const [subscribers, setSubscribers] = React.useState<SubscriberRow[]>([])
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [replyToId, setReplyToId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    () => new Set()
  )

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      setError(null)
      try {
        const timeline = await getIssueTimeline({
          data: { teamId, issueId },
        })
        setComments(timeline.comments)
        setActivities(timeline.activities)
        setSubscribers(timeline.subscribers)
        setIsSubscribed(timeline.isSubscribed)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load activity")
        setComments([])
        setActivities([])
        setSubscribers([])
      } finally {
        setLoading(false)
      }
    },
    [teamId, issueId]
  )

  React.useEffect(() => {
    setReplyToId(null)
    void load()
  }, [load])

  React.useEffect(() => {
    if (refreshKey === 0) return
    void load({ silent: true })
  }, [refreshKey, load])

  const repliesByParent = React.useMemo(() => {
    const map = new Map<string, IssueCommentRow[]>()
    for (const c of comments) {
      if (!c.parentId) continue
      const list = map.get(c.parentId) ?? []
      list.push(c)
      map.set(c.parentId, list)
    }
    return map
  }, [comments])

  const timeline = React.useMemo(() => {
    const items: TimelineItem[] = [
      ...activities.map((activity) => ({
        kind: "activity" as const,
        at: toTime(activity.createdAt),
        activity,
      })),
      ...comments
        .filter((c) => !c.parentId)
        .map((comment) => ({
          kind: "comment" as const,
          at: toTime(comment.createdAt),
          comment,
        })),
    ]
    items.sort((a, b) => a.at - b.at)
    return groupTimeline(items)
  }, [activities, comments])

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function postComment(body: string, parentId: string | null) {
    await mutate(
      () =>
        createIssueComment({
          data: { teamId, issueId, body, parentId },
        }),
      { errorMessage: "Could not post comment" }
    )
    setReplyToId(null)
    await load()
  }

  async function toggleSubscription() {
    if (subBusy) return
    const next = !isSubscribed
    try {
      await mutateSub(
        async () => {
          await setIssueSubscription({
            data: { teamId, issueId, subscribe: next },
          })
          const sub = await listIssueSubscribers({ data: { teamId, issueId } })
          setIsSubscribed(sub.isSubscribed)
          setSubscribers(sub.subscribers)
        },
        {
          errorMessage: "Could not update subscription",
          invalidate: false,
        }
      )
    } catch {
      // toast handled by useServerMutation
    }
  }

  const visibleSubscribers = subscribers.slice(0, 5)
  const extraCount = Math.max(0, subscribers.length - visibleSubscribers.length)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">Activity</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={subBusy}
            onClick={() => void toggleSubscription()}
          >
            {isSubscribed ? "Unsubscribe" : "Subscribe"}
          </Button>
          {subscribers.length > 0 ? (
            <div className="flex items-center -space-x-1.5">
              {visibleSubscribers.map((s) => (
                <Avatar
                  key={s.userId}
                  className="size-6 ring-2 ring-background"
                  title={s.name}
                >
                  {s.image ? <AvatarImage src={s.image} alt={s.name} /> : null}
                  <AvatarFallback className="text-[9px]">
                    {getInitials(s.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {extraCount > 0 ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                  +{extraCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : timeline.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No activity yet. Leave a comment to get started.
        </p>
      ) : (
        <ul className="flex flex-col">
          {timeline.map((segment) => {
            if (segment.kind === "activities") {
              if (segment.activities.length > ACTIVITY_COLLAPSE_THRESHOLD) {
                return (
                  <li key={`g-${segment.key}`}>
                    <CollapsedActivityGroup
                      activities={segment.activities}
                      expanded={expandedGroups.has(segment.key)}
                      onToggle={() => toggleGroup(segment.key)}
                    />
                  </li>
                )
              }

              return (
                <li key={`g-${segment.key}`} className="flex flex-col">
                  {segment.activities.map((activity) => (
                    <ActivityLogItem key={activity.id} activity={activity} />
                  ))}
                </li>
              )
            }

            const root = segment.comment
            const replies = repliesByParent.get(root.id) ?? []
            return (
              <li key={`c-${root.id}`} className="flex flex-col">
                <CommentItem
                  comment={root}
                  teamId={teamId}
                  issueId={issueId}
                  depth={0}
                  currentUserId={currentUserId}
                  onReply={setReplyToId}
                  onDeleted={() => void load()}
                />
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    teamId={teamId}
                    issueId={issueId}
                    depth={1}
                    currentUserId={currentUserId}
                    onReply={setReplyToId}
                    onDeleted={() => void load()}
                  />
                ))}
                {replyToId === root.id ? (
                  <div className="ml-8 pb-2">
                    <IssueCommentComposer
                      teamId={teamId}
                      autoFocus
                      placeholder={`Reply to ${root.authorName}…`}
                      onCancel={() => setReplyToId(null)}
                      onSubmit={(body) => postComment(body, root.id)}
                    />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <IssueCommentComposer
        teamId={teamId}
        onSubmit={(body) => postComment(body, null)}
      />
    </div>
  )
}

/** @deprecated Use IssueActivity — kept for existing imports. */
export const IssueComments = IssueActivity
