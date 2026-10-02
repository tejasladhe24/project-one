import * as React from "react"
import { Link } from "@tanstack/react-router"
import { IconPlus, IconSearch } from "@tabler/icons-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  IssueMetadataFields,
  type IssueMetadataValue,
} from "@/components/issue/issue-metadata-fields"
import { IssueEstimateField } from "@/components/issue/issue-estimate-field"
import {
  CreateIssueForm,
  type CreateIssueFormHandle,
  type CreateIssueProjectOption,
  type CreateIssueTeamOption,
} from "@/components/issues/create-issue-form"
import { useIssueMetadataOptions } from "@/hooks/issues/use-issue-metadata-options"
import {
  formatCycleRangeLabel,
  getCurrentCycleNumber,
} from "@/lib/cycles/dates"
import { formatIssueKey } from "@/lib/issues/meta"
import { type IssueRow } from "@/lib/issues/rows"

export type { IssueRow } from "@/lib/issues/rows"

export type IssueProjectOption = CreateIssueProjectOption

export type IssueTeamOption = CreateIssueTeamOption

function formatDueDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function toMetadataValue(issue: IssueRow): IssueMetadataValue {
  return {
    id: issue.id,
    teamId: issue.teamId,
    statusId: issue.statusId,
    statusName: issue.statusName,
    statusCategory: issue.statusCategory,
    statusSortOrder: issue.statusSortOrder,
    priority: issue.priority,
    assigneeId: issue.assigneeId,
    assigneeName: issue.assigneeName,
    assigneeImage: issue.assigneeImage,
    projectId: issue.projectId,
    projectName: issue.projectName,
    labels: issue.labels,
    cycleNumber: issue.cycleNumber,
  }
}

function mergeMetadataIntoRow(
  issue: IssueRow,
  next: IssueMetadataValue
): IssueRow {
  return {
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
    cycleNumber: next.cycleNumber ?? null,
  }
}

type IssueGroup = {
  key: string
  label: string
  sortOrder: number
  meta?: string | null
  badge?: string | null
  issues: IssueRow[]
}

type IssuesTableProps = {
  data: IssueRow[]
  projects: IssueProjectOption[]
  teams: IssueTeamOption[]
  /** Required when create dialog is shown (`hideCreate` is false). */
  organizationId?: string
  teamId?: string
  teamName?: string
  mode?: "mine" | "team"
  /** Overrides default status/team grouping. */
  groupBy?: "status" | "team" | "cycle"
  title?: string
  emptyMessage?: string
  hideCreate?: boolean
  /** When groupBy=cycle, always show this cycle even if empty. */
  currentCycleNumber?: number | null
  /** Used for empty current-cycle header labels when no issues exist. */
  cycleSettings?: {
    cyclesEnabled: boolean
    cycleDurationWeeks: number
    cycleStartDay: number
    cyclesOrigin: string | null
  } | null
  currentUserId?: string
  onCreated?: () => void
  onUpdated?: () => void
}

function IssueTableRow({
  issue,
  options,
  onUpdated,
  onEstimateUpdated,
}: {
  issue: IssueRow
  options: {
    statuses: {
      id: string
      name: string
      category: string
      sortOrder: number
    }[]
    members: { userId: string; name: string; image: string | null }[]
    projects: { id: string; name: string }[]
    labels: { id: string; name: string }[]
    cycle?: { enabled: boolean; currentNumber: number | null }
  }
  onUpdated: (next: IssueMetadataValue) => void
  onEstimateUpdated: (estimatedHours: number | null) => void
}) {
  const due = formatDueDate(issue.dueDate)

  return (
    <li className="group flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30">
      <Link
        to="/issue/$issueId"
        params={{ issueId: issue.id }}
        className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums hover:text-foreground hover:underline"
      >
        {formatIssueKey(issue.teamIdentifier, issue.number, 3)}
      </Link>
      <Link
        to="/issue/$issueId"
        params={{ issueId: issue.id }}
        className="min-w-0 flex-1 truncate text-sm hover:underline"
      >
        {issue.title}
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <IssueMetadataFields
          issue={toMetadataValue(issue)}
          options={options}
          onUpdated={onUpdated}
          variant="row"
        />
        <IssueEstimateField
          issueId={issue.id}
          teamId={issue.teamId}
          estimatedHours={issue.estimatedHours}
          settings={{
            estimateType: issue.estimateType,
            allowZeroEstimates: issue.allowZeroEstimates,
            extendedEstimateScale: issue.extendedEstimateScale,
            countUnestimatedIssues: issue.countUnestimatedIssues,
          }}
          onUpdated={(estimatedHours) => onEstimateUpdated(estimatedHours)}
          variant="row"
        />
        {due ? (
          <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
            {due}
          </span>
        ) : null}
      </div>
    </li>
  )
}

export function IssuesTable({
  data,
  projects: projectOptions,
  teams,
  organizationId,
  teamId,
  teamName,
  mode = "team",
  groupBy: groupByProp,
  title: titleProp,
  emptyMessage,
  hideCreate = false,
  currentCycleNumber = null,
  cycleSettings = null,
  currentUserId,
  onCreated,
  onUpdated,
}: IssuesTableProps) {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const createFormRef = React.useRef<CreateIssueFormHandle>(null)
  const skipCreateAutosaveRef = React.useRef(false)
  const [issues, setIssues] = React.useState(data)

  React.useEffect(() => {
    setIssues(data)
  }, [data])

  const groupBy =
    groupByProp ?? (mode === "mine" ? ("team" as const) : ("status" as const))

  const teamIds = React.useMemo(() => {
    if (teamId) return [teamId]
    return [...new Set(issues.map((i) => i.teamId))]
  }, [teamId, issues])

  const { byTeam, projects, labels } = useIssueMetadataOptions(teamIds)

  const statusOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const issue of issues) {
      if (issue.statusId && issue.statusName) {
        map.set(issue.statusId, issue.statusName)
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [issues])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return issues.filter((issue) => {
      if (statusFilter !== "all" && issue.statusId !== statusFilter) {
        return false
      }
      if (!q) return true
      const displayId = formatIssueKey(issue.teamIdentifier, issue.number, 3)
      return (
        issue.title.toLowerCase().includes(q) ||
        displayId.toLowerCase().includes(q) ||
        (issue.projectName?.toLowerCase().includes(q) ?? false) ||
        (issue.teamName?.toLowerCase().includes(q) ?? false) ||
        issue.labels.some((label) => label.name.toLowerCase().includes(q))
      )
    })
  }, [issues, query, statusFilter])

  const grouped = React.useMemo((): IssueGroup[] => {
    if (groupBy === "team") {
      const groups = new Map<string, IssueGroup>()
      for (const issue of filtered) {
        const key = issue.teamId
        const existing = groups.get(key)
        if (existing) {
          existing.issues.push(issue)
        } else {
          groups.set(key, {
            key,
            label: issue.teamName ?? "Team",
            sortOrder: 0,
            issues: [issue],
          })
        }
      }
      return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
    }

    if (groupBy === "cycle") {
      const groups = new Map<number, IssueGroup>()
      for (const issue of filtered) {
        if (issue.cycleNumber == null) continue
        const existing = groups.get(issue.cycleNumber)
        if (existing) {
          existing.issues.push(issue)
          continue
        }
        const settings = {
          cyclesEnabled: issue.cyclesEnabled,
          cycleDurationWeeks: issue.cycleDurationWeeks,
          cycleStartDay: issue.cycleStartDay,
          cyclesOrigin: issue.cyclesOrigin,
        }
        groups.set(issue.cycleNumber, {
          key: String(issue.cycleNumber),
          label: `Cycle ${issue.cycleNumber}`,
          sortOrder: -issue.cycleNumber,
          meta: formatCycleRangeLabel(settings, issue.cycleNumber),
          badge:
            currentCycleNumber != null &&
            issue.cycleNumber === currentCycleNumber
              ? "Current"
              : null,
          issues: [issue],
        })
      }

      if (currentCycleNumber != null && !groups.has(currentCycleNumber)) {
        const sample = issues[0]
        const settings = sample
          ? {
              cyclesEnabled: sample.cyclesEnabled,
              cycleDurationWeeks: sample.cycleDurationWeeks,
              cycleStartDay: sample.cycleStartDay,
              cyclesOrigin: sample.cyclesOrigin,
            }
          : cycleSettings
        groups.set(currentCycleNumber, {
          key: String(currentCycleNumber),
          label: `Cycle ${currentCycleNumber}`,
          sortOrder: -currentCycleNumber,
          meta: settings
            ? formatCycleRangeLabel(settings, currentCycleNumber)
            : null,
          badge: "Current",
          issues: [],
        })
      }

      return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder)
    }

    const groups = new Map<string, IssueGroup>()
    for (const issue of filtered) {
      const key = issue.statusId ?? "none"
      const existing = groups.get(key)
      if (existing) {
        existing.issues.push(issue)
      } else {
        groups.set(key, {
          key,
          label: issue.statusName ?? "No status",
          sortOrder: issue.statusSortOrder ?? 999,
          issues: [issue],
        })
      }
    }
    return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [filtered, groupBy, currentCycleNumber, issues, cycleSettings])

  const statusFilterItems = [
    { label: "All statuses", value: "all" },
    ...statusOptions.map((s) => ({ label: s.name, value: s.id })),
  ]

  function handleRowUpdated(issueId: string, next: IssueMetadataValue) {
    setIssues((prev) => {
      if (
        mode === "mine" &&
        currentUserId &&
        next.assigneeId !== currentUserId
      ) {
        return prev.filter((issue) => issue.id !== issueId)
      }
      if (groupBy === "cycle" && next.cycleNumber == null) {
        return prev.filter((issue) => issue.id !== issueId)
      }
      return prev.map((issue) =>
        issue.id === issueId ? mergeMetadataIntoRow(issue, next) : issue
      )
    })
    onUpdated?.()
  }

  function handleEstimateUpdated(
    issueId: string,
    estimatedHours: number | null
  ) {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, estimatedHours } : issue
      )
    )
    onUpdated?.()
  }

  const title = titleProp ?? (mode === "mine" ? "My Issues" : "Issues")

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h1 className="mr-2 text-base font-semibold tracking-tight">
            {title}
          </h1>
          <div className="relative w-full max-w-sm">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter issues…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            items={statusFilterItems}
            value={statusFilter}
            onValueChange={(value) => {
              if (value === null) return
              setStatusFilter(value)
            }}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {teamId && groupBy !== "cycle" ? (
            <Badge variant="secondary" className="gap-1">
              Team: {teamName ?? teamId.slice(0, 8)}
              <Link
                to="/issues"
                search={{}}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                ×
              </Link>
            </Badge>
          ) : null}
        </div>
        {!hideCreate && organizationId ? (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              if (!open) {
                if (!skipCreateAutosaveRef.current) {
                  void createFormRef.current?.saveDraftIfNeeded({
                    silent: true,
                  })
                }
                skipCreateAutosaveRef.current = false
              }
              setCreateOpen(open)
            }}
          >
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <IconPlus data-icon="inline-start" />
              <span className="hidden lg:inline">New issue</span>
              <span className="lg:hidden">New</span>
            </DialogTrigger>
            <DialogContent className="flex max-h-[min(92vh,880px)] w-full flex-col gap-4 overflow-hidden sm:max-w-3xl">
              <DialogHeader className="shrink-0">
                <DialogTitle>
                  {teamName ? `${teamName} · New issue` : "New issue"}
                </DialogTitle>
                <DialogDescription>
                  Write the title and description here, or save a draft and
                  finish later.
                </DialogDescription>
              </DialogHeader>
              <CreateIssueForm
                ref={createFormRef}
                projects={projectOptions}
                teams={teams}
                teamId={teamId}
                organizationId={organizationId}
                onCreated={() => {
                  skipCreateAutosaveRef.current = true
                  setCreateOpen(false)
                  onCreated?.()
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          {grouped.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {emptyMessage ??
                (mode === "mine"
                  ? "No issues assigned to you."
                  : "No issues yet.")}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.key} className="border-b last:border-b-0">
                <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                  {groupBy === "team" ? (
                    <Link
                      to="/issues"
                      search={{ team_id: group.key }}
                      className="hover:underline"
                    >
                      {group.label}
                    </Link>
                  ) : (
                    <span>{group.label}</span>
                  )}
                  {group.badge ? (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px] font-normal"
                    >
                      {group.badge}
                    </Badge>
                  ) : null}
                  {group.meta ? (
                    <span className="font-normal text-muted-foreground">
                      {group.meta}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground tabular-nums">
                    {group.issues.length}
                  </span>
                </div>
                {group.issues.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No issues in this cycle yet.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {group.issues.map((issue) => {
                      const teamOpts = byTeam[issue.teamId]
                      return (
                        <IssueTableRow
                          key={issue.id}
                          issue={issue}
                          options={{
                            statuses: teamOpts?.statuses ?? [],
                            members: teamOpts?.members ?? [],
                            projects,
                            labels,
                            cycle: issue.cyclesEnabled
                              ? {
                                  enabled: true,
                                  currentNumber: getCurrentCycleNumber({
                                    cyclesEnabled: issue.cyclesEnabled,
                                    cycleDurationWeeks:
                                      issue.cycleDurationWeeks,
                                    cycleStartDay: issue.cycleStartDay,
                                    cyclesOrigin: issue.cyclesOrigin,
                                  }),
                                }
                              : undefined,
                          }}
                          onUpdated={(next) => handleRowUpdated(issue.id, next)}
                          onEstimateUpdated={(estimatedHours) =>
                            handleEstimateUpdated(issue.id, estimatedHours)
                          }
                        />
                      )
                    })}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
