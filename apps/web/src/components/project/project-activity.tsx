import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  IconBox,
  IconCalendar,
  IconCircleDot,
  IconFlag,
  IconMessage2Down,
  IconSelector,
  IconTag,
  IconTrash,
  IconUsers,
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
import { getInitials } from "@/lib/issues/meta"
import {
  createProjectComment,
  deleteProjectComment,
  getProjectTimeline,
} from "@/lib/projects/comments"

export type ProjectCommentRow = {
  id: string
  projectId: string
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
  projectId: string
  type: string
  message: string
  createdAt: Date | string
  actorId: string | null
  actorName: string | null
  actorImage: string | null
}

type ProjectActivityProps = {
  projectId: string
  currentUserId?: string | null
  /** Bump when project metadata changes so the timeline reloads. */
  refreshKey?: string | number
  className?: string
}

const MENTION_RE = /@\[([^\]]+)\]\((user|issue):([^)]+)\)/g

type TimelineItem =
  | { kind: "activity"; at: number; activity: ActivityRow }
  | { kind: "comment"; at: number; comment: ProjectCommentRow }

type TimelineSegment =
  | { kind: "comment"; comment: ProjectCommentRow }
  | { kind: "activities"; key: string; activities: ActivityRow[] }

const ACTIVITY_COLLAPSE_THRESHOLD = 4

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

function activityIcon(type: string) {
  switch (type) {
    case "status-change":
      return <IconCircleDot className="size-3.5" />
    case "priority-change":
      return <IconFlag className="size-3.5" />
    case "lead-change":
    case "member-change":
      return <IconUserPlus className="size-3.5" />
    case "team-change":
      return <IconUsers className="size-3.5" />
    case "label-change":
      return <IconTag className="size-3.5" />
    case "date-change":
      return <IconCalendar className="size-3.5" />
    case "created":
      return <IconBox className="size-3.5" />
    default:
      return <IconCircleDot className="size-3.5" />
  }
}

function ActivityLogItem({ activity }: { activity: ActivityRow }) {
  const name = activity.actorName ?? "Someone"
  const message = activity.message || `${name} updated the project`

  return (
    <div className="group/activity flex items-start gap-3 py-1.5">
      {activity.type === "created" ? (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <IconBox className="size-3.5" />
        </span>
      ) : (
        <Avatar className="mt-0.5 size-6 shrink-0">
          {activity.actorImage ? (
            <AvatarImage src={activity.actorImage} alt={name} />
          ) : null}
          <AvatarFallback className="bg-muted text-[9px] text-muted-foreground">
            {activity.actorId ? getInitials(name) : activityIcon(activity.type)}
          </AvatarFallback>
        </Avatar>
      )}
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
        Show {activities.length} events…
      </span>
    </button>
  )
}

function CommentItem({
  comment,
  projectId,
  depth,
  currentUserId,
  onReply,
  onDeleted,
}: {
  comment: ProjectCommentRow
  projectId: string
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
          deleteProjectComment({
            data: { projectId, commentId: comment.id },
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

export function ProjectActivity({
  projectId,
  currentUserId,
  refreshKey = 0,
  className,
}: ProjectActivityProps) {
  const { mutate } = useServerMutation()
  const [comments, setComments] = React.useState<ProjectCommentRow[]>([])
  const [activities, setActivities] = React.useState<ActivityRow[]>([])
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
        const timeline = await getProjectTimeline({
          data: { projectId },
        })
        setComments(timeline.comments)
        setActivities(timeline.activities)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load activity")
        setComments([])
        setActivities([])
      } finally {
        setLoading(false)
      }
    },
    [projectId]
  )

  React.useEffect(() => {
    setReplyToId(null)
    void load()
  }, [load])

  const lastRefreshKey = React.useRef(refreshKey)
  React.useEffect(() => {
    if (refreshKey === lastRefreshKey.current) return
    lastRefreshKey.current = refreshKey
    void load({ silent: true })
  }, [refreshKey, load])

  const repliesByParent = React.useMemo(() => {
    const map = new Map<string, ProjectCommentRow[]>()
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
        createProjectComment({
          data: { projectId, body, parentId },
        }),
      { errorMessage: "Could not post comment" }
    )
    setReplyToId(null)
    await load()
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
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
                  projectId={projectId}
                  depth={0}
                  currentUserId={currentUserId}
                  onReply={setReplyToId}
                  onDeleted={() => void load()}
                />
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    projectId={projectId}
                    depth={1}
                    currentUserId={currentUserId}
                    onReply={setReplyToId}
                    onDeleted={() => void load()}
                  />
                ))}
                {replyToId === root.id ? (
                  <div className="ml-8 pb-2">
                    <IssueCommentComposer
                      projectId={projectId}
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
        projectId={projectId}
        onSubmit={(body) => postComment(body, null)}
      />
    </div>
  )
}
