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
