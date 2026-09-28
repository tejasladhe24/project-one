import * as React from "react"
import { IconCheck, IconPyramid } from "@tabler/icons-react"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command"
import { cn } from "@workspace/ui/lib/utils"
import {
  MetaIconTrigger,
  MetaMenu,
  MetaPillTrigger,
} from "@/components/issue/meta-menu"
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  formatEstimateLabel,
  getEstimateOptions,
  type TeamEstimateSettings,
} from "@/lib/estimates"
import { updateIssue } from "@/lib/issues"

type IssueEstimateFieldProps = {
  issueId: string
  teamId: string
  estimatedHours: number | null
  settings: TeamEstimateSettings
  onUpdated?: (estimatedHours: number | null) => void
  variant?: "pills" | "row"
  className?: string
}

export function IssueEstimateField({
  issueId,
  teamId,
  estimatedHours,
  settings,
  onUpdated,
  variant = "row",
  className,
}: IssueEstimateFieldProps) {
  const { mutate, pending: busy } = useServerMutation()
  const [open, setOpen] = React.useState(false)
  const [local, setLocal] = React.useState(estimatedHours)

  React.useEffect(() => {
    setLocal(estimatedHours)
  }, [estimatedHours])

  const options = getEstimateOptions(settings)
  if (!options) return null

  const label = formatEstimateLabel(local, settings.estimateType)
  const isRow = variant === "row"

  async function selectEstimate(value: number | null) {
    if (busy) return
    const previous = local
    setLocal(value)
    setOpen(false)
    try {
      await mutate(
        () =>
          updateIssue({
            data: {
              teamId,
              issueId,
              estimatedHours: value,
            },
          }),
        { errorMessage: "Failed to update estimate" }
      )
      onUpdated?.(value)
    } catch {
      setLocal(previous)
    }
  }

  return (
    <div className={cn(className)} onClick={(e) => e.stopPropagation()}>
      <MetaMenu
        open={open}
        onOpenChange={setOpen}
        placeholder="Set estimate…"
        className="w-48"
        trigger={
          isRow ? (
            <MetaIconTrigger
              disabled={busy}
              title={label ? `Estimate ${label}` : "Estimate"}
              className={cn(
                "w-auto min-w-7 gap-1 px-1.5",
                !label && "opacity-50"
              )}
            >
              <IconPyramid className="size-3.5" />
              {label ? (
                <span className="text-xs tabular-nums">{label}</span>
              ) : null}
            </MetaIconTrigger>
          ) : (
            <MetaPillTrigger disabled={busy}>
              <IconPyramid className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{label ?? "Estimate"}</span>
            </MetaPillTrigger>
          )
        }
      >
        <CommandEmpty>No estimate options.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="No estimate"
            disabled={busy}
            onSelect={() => void selectEstimate(null)}
            className="gap-2"
          >
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              No estimate
            </span>
            {local == null ? <IconCheck className="size-4 shrink-0" /> : null}
          </CommandItem>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              disabled={busy}
              onSelect={() => void selectEstimate(option.value)}
              className="gap-2"
            >
              <IconPyramid className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate tabular-nums">
                {option.label}
              </span>
              {local === option.value ? (
                <IconCheck className="size-4 shrink-0" />
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </MetaMenu>
    </div>
  )
}
