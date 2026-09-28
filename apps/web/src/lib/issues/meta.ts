export const ISSUE_PRIORITIES = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
] as const

export type IssuePriorityValue = (typeof ISSUE_PRIORITIES)[number]["value"]

export function priorityLabel(priority: number | null | undefined) {
  return (
    ISSUE_PRIORITIES.find((p) => p.value === (priority ?? 0))?.label ??
    "No priority"
  )
}

export function statusColor(category: string | null | undefined, name = "") {
  if (category === "triage") return "#f97316"
  if (category === "completed") return "#a855f7"
  if (category === "canceled" || category === "duplicate") return "#9ca3af"
  if (category === "started") {
    const n = name.toLowerCase()
    if (n.includes("block") || n.includes("fail")) return "#ef4444"
    if (n.includes("ready") || n.includes("qa") || n.includes("rc")) {
      if (n.includes("fail")) return "#ef4444"
      if (n.includes("product") && !n.includes("ready")) return "#f97316"
      return "#22c55e"
    }
    if (n.includes("review") || n.includes("dev") || n.includes("product")) {
      return "#f97316"
    }
    if (n.includes("progress")) return "#eab308"
    return "#eab308"
  }
  if (category === "unstarted") return "#6b7280"
  if (category === "backlog") return "#9ca3af"
  return "#9ca3af"
}

/** Progressive fill for multiple statuses in the `started` category. */
export function startedFillPercent(sortOrder: number, maxSortOrder: number) {
  const k = 1.5
  return Math.min(
    100,
    Math.max(0, ((sortOrder + k) / (maxSortOrder + 2 * k)) * 100)
  )
}

export function maxStartedSortOrder(
  statuses: { category: string; sortOrder: number }[]
) {
  let max = 0
  for (const s of statuses) {
    if (s.category === "started" && s.sortOrder > max) max = s.sortOrder
  }
  return max
}

export function statusDotClass(category: string | null | undefined) {
  switch (category) {
    case "completed":
      return "bg-blue-500"
    case "started":
      return "bg-orange-500"
    case "canceled":
    case "duplicate":
      return "bg-muted-foreground"
    case "triage":
      return "bg-amber-500"
    case "backlog":
      return "border border-muted-foreground/50 bg-transparent"
    case "unstarted":
      return "bg-sky-500/80"
    default:
      return "bg-muted-foreground/50"
  }
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

export function formatIssueKey(
  identifier: string | null | undefined,
  number: number,
  pad = 4
) {
  const prefix = identifier?.trim() || "ISS"
  return `${prefix.toUpperCase()}-${String(number).padStart(pad, "0")}`
}

export function labelDotColor(name: string) {
  const palette = [
    "#f9a8d4",
    "#7dd3fc",
    "#86efac",
    "#fcd34d",
    "#c4b5fd",
    "#fda4af",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % palette.length
  }
  return palette[hash]!
}

export type MetadataStatus = {
  id: string
  name: string
  category: string
  sortOrder: number
}

export type MetadataMember = {
  userId: string
  name: string
  image: string | null
}

export type MetadataProject = {
  id: string
  name: string
}

export type MetadataLabel = {
  id: string
  name: string
}

export type IssueMetadataValue = {
  id: string
  teamId: string
  statusId: string | null
  statusName: string | null
  statusCategory: string | null
  statusSortOrder?: number | null
  priority: number | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeImage: string | null
  projectId: string | null
  projectName: string | null
  labels: { id: string; name: string }[]
  cycleNumber?: number | null
}

export type IssueCycleOption = {
  enabled: boolean
  currentNumber: number | null
}

export function issueMetadataFingerprint(issue: IssueMetadataValue) {
  return [
    issue.id,
    issue.statusId,
    issue.statusName,
    issue.statusCategory,
    issue.statusSortOrder,
    issue.priority,
    issue.assigneeId,
    issue.assigneeName,
    issue.projectId,
    issue.projectName,
    issue.cycleNumber ?? "",
    issue.labels.map((l) => l.id).join(","),
  ].join("|")
}
