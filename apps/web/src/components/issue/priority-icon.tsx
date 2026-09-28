import { cn } from "@workspace/ui/lib/utils"

export function PriorityIcon({
  priority,
  className,
}: {
  priority: number | null | undefined
  className?: string
}) {
  const filled =
    priority === 1 || priority === 2
      ? 3
      : priority === 3
        ? 2
        : priority === 4
          ? 1
          : 0
  const color =
    priority === 1
      ? "bg-red-500"
      : priority === 2
        ? "bg-orange-500"
        : priority === 3
          ? "bg-yellow-500"
          : "bg-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex h-4 w-3.5 shrink-0 items-end justify-between gap-px",
        className
      )}
      aria-hidden
    >
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          className={cn(
            "w-[3px] rounded-[1px]",
            level <= filled ? color : "bg-muted-foreground/25"
          )}
          style={{ height: `${4 + level * 3}px` }}
        />
      ))}
    </span>
  )
}
