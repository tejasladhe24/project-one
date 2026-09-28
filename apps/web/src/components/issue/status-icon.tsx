import { IconCheck, IconEqual, IconX } from "@tabler/icons-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  startedFillPercent,
  statusColor,
  statusDotClass,
} from "@/lib/issues/meta"

export function StatusDot({
  category,
  className,
}: {
  category: string | null | undefined
  className?: string
}) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        statusDotClass(category),
        className
      )}
      aria-hidden
    />
  )
}

type StatusIconProps = {
  category: string | null | undefined
  name?: string | null
  sortOrder?: number
  maxSortOrder?: number
  /** Visual size: `sm` for menus/table, `md` for settings. */
  size?: "sm" | "md"
  className?: string
}

/**
 * Workflow status icon — matches team status settings, including progressive
 * fill for multiple statuses in the `started` category.
 */
export function StatusIcon({
  category,
  name = "",
  sortOrder = 0,
  maxSortOrder = 0,
  size = "sm",
  className,
}: StatusIconProps) {
  const color = statusColor(category, name ?? "")
  const box = size === "md" ? "size-5" : "size-4"
  const inner = size === "md" ? "size-3.5" : "size-3"
  const icon = size === "md" ? "size-3" : "size-2.5"

  if (category === "completed") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          box,
          className
        )}
        style={{ backgroundColor: "#7c3aed" }}
        aria-hidden
      >
        <IconCheck className={cn(icon, "text-white")} stroke={2.5} />
      </span>
    )
  }

  if (category === "canceled") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-zinc-600",
          box,
          className
        )}
        aria-hidden
      >
        <IconX className={cn(icon, "text-white")} stroke={2.5} />
      </span>
    )
  }

  if (category === "duplicate") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-zinc-600",
          box,
          className
        )}
        aria-hidden
      >
        <IconEqual className={cn(icon, "rotate-45 text-white")} stroke={2.5} />
      </span>
    )
  }

  if (category === "started") {
    const fill = startedFillPercent(sortOrder, maxSortOrder || sortOrder || 1)
    const pie = size === "md" ? "size-4" : "size-3.5"
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          box,
          className
        )}
        aria-hidden
      >
        <span
          className={cn("block rounded-full", pie)}
          style={{
            background: `conic-gradient(${color} 0% ${fill}%, transparent ${fill}% 100%)`,
            boxShadow: `inset 0 0 0 1.5px ${color}`,
          }}
        />
      </span>
    )
  }

  if (category === "triage") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted",
          box,
          className
        )}
        aria-hidden
      >
        <span
          className={cn("rounded-full", inner)}
          style={{ backgroundColor: color }}
        />
      </span>
    )
  }

  // backlog / unstarted — dashed ring
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        box,
        className
      )}
      aria-hidden
    >
      <span
        className={cn("rounded-full border-2 border-dashed", inner)}
        style={{ borderColor: color }}
      />
    </span>
  )
}

/** @deprecated Prefer StatusIcon — kept for callers that only pass category. */
export function StatusPieIcon({
  category,
  statusName,
  sortOrder,
  maxSortOrder,
  className,
}: {
  category?: string | null
  statusName?: string | null
  sortOrder?: number
  maxSortOrder?: number
  className?: string
}) {
  return (
    <StatusIcon
      category={category}
      name={statusName}
      sortOrder={sortOrder}
      maxSortOrder={maxSortOrder}
      className={className}
    />
  )
}
