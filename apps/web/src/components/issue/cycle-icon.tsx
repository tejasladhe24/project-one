import { cn } from "@workspace/ui/lib/utils"

type CycleIconProps = {
  className?: string
  /** When false, renders a muted empty ring (no active cycle). */
  active?: boolean
}

/**
 * Linear-style cycle mark: ring with a short progress arc and a play triangle.
 */
export function CycleIcon({ className, active = true }: CycleIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("size-3.5 shrink-0", className)}
    >
      <circle
        cx="8"
        cy="8"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.5"
        className={
          active ? "text-muted-foreground/55" : "text-muted-foreground"
        }
      />
      {active ? (
        <path
          d="M8 2.25a5.75 5.75 0 0 1 5.75 5.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-indigo-400"
        />
      ) : null}
      <path
        d="M6.85 5.75v4.5L10.6 8 6.85 5.75Z"
        fill="currentColor"
        className="text-muted-foreground"
      />
    </svg>
  )
}
