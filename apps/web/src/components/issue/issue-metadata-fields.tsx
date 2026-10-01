import * as React from "react"
import {
  IconBox,
  IconCheck,
  IconTag,
  IconUser,
  IconUserOff,
} from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command"
import { cn } from "@workspace/ui/lib/utils"
import { CycleIcon } from "@/components/issue/cycle-icon"
import { PriorityIcon } from "@/components/issue/priority-icon"
import { StatusIcon } from "@/components/issue/status-icon"
import {
  MetaIconTrigger,
  MetaMenu,
  MetaPillTrigger,
} from "@/components/issue/meta-menu"
import { useIssueMetadataUpdate } from "@/hooks/issues/use-issue-metadata-update"
import {
  type IssueCycleOption,
  type IssueMetadataValue,
  type MetadataLabel,
  type MetadataMember,
  type MetadataProject,
  type MetadataStatus,
} from "@/lib/issues/meta"
import { labelDotColor } from "@/lib/labels/display"
import { PRIORITIES, priorityLabel } from "@/lib/shared/priority"
import { getInitials } from "@/lib/shared/string"
import { maxStartedSortOrder } from "@/lib/statuses/display"

export type {
  IssueCycleOption,
  IssueMetadataValue,
  MetadataLabel,
  MetadataMember,
  MetadataProject,
  MetadataStatus,
}

type FieldOptions = {
  statuses: MetadataStatus[]
  members: MetadataMember[]
  projects: MetadataProject[]
  labels: MetadataLabel[]
  cycle?: IssueCycleOption
}

type IssueMetadataFieldsProps = {
  issue: IssueMetadataValue
  options: FieldOptions
  onUpdated?: (next: IssueMetadataValue) => void
  className?: string
  /** `pills` = detail header; `row` = compact table controls */
  variant?: "pills" | "row"
}

function Check({ show }: { show: boolean }) {
  return show ? <IconCheck className="size-4 shrink-0" /> : null
}

export function IssueMetadataFields({
  issue,
  options,
  onUpdated,
  className,
  variant = "pills",
}: IssueMetadataFieldsProps) {
  const { statuses, members, projects, labels, cycle } = options
  const { local, busy, patch, toggleLabel } = useIssueMetadataUpdate(
    issue,
    options,
    onUpdated
  )
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [priorityOpen, setPriorityOpen] = React.useState(false)
  const [assigneeOpen, setAssigneeOpen] = React.useState(false)
  const [projectOpen, setProjectOpen] = React.useState(false)
  const [labelsOpen, setLabelsOpen] = React.useState(false)

  const isRow = variant === "row"
  const labelCount = local.labels.length
  const startedMax = maxStartedSortOrder(statuses)
  const currentStatus = statuses.find((s) => s.id === local.statusId)
  const currentSortOrder =
    currentStatus?.sortOrder ?? local.statusSortOrder ?? 0
  const inCycle = local.cycleNumber != null
  const cycleLabel = inCycle
    ? `Cycle ${local.cycleNumber}`
    : cycle?.currentNumber != null
      ? `Add to cycle ${cycle.currentNumber}`
      : "No cycle"

  async function toggleCycle() {
    if (!cycle?.enabled || cycle.currentNumber == null || busy) return
    if (local.cycleNumber != null) {
      await patch({ cycleNumber: null })
    } else {
      await patch({ cycleNumber: cycle.currentNumber })
    }
  }

  return (
    <div
      className={cn(
        isRow
          ? "flex items-center gap-0.5"
          : "flex flex-wrap items-center gap-1.5",
        className
      )}
    >
      <MetaMenu
        open={statusOpen}
        onOpenChange={setStatusOpen}
        placeholder="Change status…"
        trigger={
          isRow ? (
            <MetaIconTrigger
              disabled={busy}
              title={local.statusName ?? "Status"}
            >
              <StatusIcon
                category={local.statusCategory}
                name={local.statusName}
                sortOrder={currentSortOrder}
                maxSortOrder={startedMax}
              />
            </MetaIconTrigger>
          ) : (
            <MetaPillTrigger disabled={busy}>
              <StatusIcon
                category={local.statusCategory}
                name={local.statusName}
                sortOrder={currentSortOrder}
                maxSortOrder={startedMax}
              />
              <span className="truncate">{local.statusName ?? "Status"}</span>
            </MetaPillTrigger>
          )
        }
      >
        <CommandEmpty>No status found.</CommandEmpty>
        <CommandGroup>
          {statuses.map((s) => (
            <CommandItem
              key={s.id}
              value={s.name}
              disabled={busy}
              onSelect={() =>
                void patch({ statusId: s.id }, () => setStatusOpen(false))
              }
              className="gap-2"
            >
              <StatusIcon
                category={s.category}
                name={s.name}
                sortOrder={s.sortOrder}
                maxSortOrder={startedMax}
              />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <Check show={local.statusId === s.id} />
            </CommandItem>
          ))}
        </CommandGroup>
      </MetaMenu>

      <MetaMenu
        open={priorityOpen}
        onOpenChange={setPriorityOpen}
        placeholder="Change priority…"
        trigger={
          isRow ? (
            <MetaIconTrigger
              disabled={busy}
              title={priorityLabel(local.priority)}
            >
              <PriorityIcon priority={local.priority} />
            </MetaIconTrigger>
          ) : (
            <MetaPillTrigger disabled={busy}>
              <PriorityIcon priority={local.priority} />
              <span className="truncate">{priorityLabel(local.priority)}</span>
            </MetaPillTrigger>
          )
        }
      >
        <CommandEmpty>No priority found.</CommandEmpty>
        <CommandGroup>
          {PRIORITIES.map((p) => (
            <CommandItem
              key={p.value}
              value={p.label}
              disabled={busy}
              onSelect={() =>
                void patch({ priority: p.value }, () => setPriorityOpen(false))
              }
              className="gap-2"
            >
              <PriorityIcon priority={p.value} />
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              <Check show={(local.priority ?? 0) === p.value} />
            </CommandItem>
          ))}
        </CommandGroup>
      </MetaMenu>

      <MetaMenu
        open={assigneeOpen}
        onOpenChange={setAssigneeOpen}
        placeholder="Assign to…"
        trigger={
          isRow ? (
            <MetaIconTrigger
              disabled={busy}
              title={local.assigneeName ?? "Assignee"}
              className="size-7"
            >
              {local.assigneeName ? (
                <Avatar className="size-5">
                  {local.assigneeImage ? (
                    <AvatarImage
                      src={local.assigneeImage}
                      alt={local.assigneeName}
                    />
                  ) : null}
                  <AvatarFallback className="text-[9px]">
                    {getInitials(local.assigneeName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="size-5 rounded-full border border-dashed border-muted-foreground/40" />
              )}
            </MetaIconTrigger>
          ) : (
            <MetaPillTrigger disabled={busy}>
              {local.assigneeName ? (
                <>
                  <Avatar className="size-4 shrink-0">
                    {local.assigneeImage ? (
                      <AvatarImage
                        src={local.assigneeImage}
                        alt={local.assigneeName}
                      />
                    ) : null}
                    <AvatarFallback className="text-[8px]">
                      {getInitials(local.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {local.assigneeName.split(" ")[0]}
                  </span>
                </>
              ) : (
                <>
                  <IconUser className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>Assignee</span>
                </>
              )}
            </MetaPillTrigger>
          )
        }
      >
        <CommandEmpty>No members found.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="No assignee"
            disabled={busy}
            onSelect={() =>
              void patch({ assigneeId: null }, () => setAssigneeOpen(false))
            }
            className="gap-2"
          >
            <IconUserOff className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">No assignee</span>
            <Check show={local.assigneeId == null} />
          </CommandItem>
          {members.map((m) => (
            <CommandItem
              key={m.userId}
              value={m.name}
              disabled={busy}
              onSelect={() =>
                void patch({ assigneeId: m.userId }, () =>
                  setAssigneeOpen(false)
                )
              }
              className="gap-2"
            >
              <Avatar className="size-5 shrink-0">
                {m.image ? <AvatarImage src={m.image} alt={m.name} /> : null}
                <AvatarFallback className="text-[9px]">
                  {getInitials(m.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              <Check show={local.assigneeId === m.userId} />
            </CommandItem>
          ))}
        </CommandGroup>
      </MetaMenu>

      <MetaMenu
        open={projectOpen}
        onOpenChange={setProjectOpen}
        placeholder="Change project…"
        trigger={
          isRow ? (
            <MetaIconTrigger
              disabled={busy}
              title={local.projectName ?? "Project"}
              className={cn(!local.projectName && "opacity-50")}
            >
              <IconBox className="size-3.5 text-orange-300" />
            </MetaIconTrigger>
          ) : (
            <MetaPillTrigger disabled={busy}>
              <IconBox className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{local.projectName ?? "Project"}</span>
            </MetaPillTrigger>
          )
        }
      >
        <CommandEmpty>No projects found.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="No project"
            disabled={busy}
            onSelect={() =>
              void patch({ projectId: null }, () => setProjectOpen(false))
            }
            className="gap-2"
          >
            <IconBox className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">No project</span>
            <Check show={local.projectId == null} />
          </CommandItem>
          {projects.map((p) => (
            <CommandItem
              key={p.id}
              value={p.name}
              disabled={busy}
              onSelect={() =>
                void patch({ projectId: p.id }, () => setProjectOpen(false))
              }
              className="gap-2"
            >
              <IconBox className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <Check show={local.projectId === p.id} />
            </CommandItem>
          ))}
        </CommandGroup>
      </MetaMenu>

      <MetaMenu
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        placeholder="Change or add labels…"
        trigger={
          isRow ? (
            <MetaIconTrigger
              disabled={busy}
              title={
                labelCount > 0
                  ? local.labels.map((l) => l.name).join(", ")
                  : "Labels"
              }
            >
              {labelCount > 0 ? (
                <span className="flex items-center -space-x-0.5">
                  {local.labels.slice(0, 3).map((l) => (
                    <span
                      key={l.id}
                      className="size-2 rounded-full ring-1 ring-background"
                      style={{ backgroundColor: labelDotColor(l.name) }}
                    />
                  ))}
                </span>
              ) : (
                <IconTag className="size-3.5" />
              )}
            </MetaIconTrigger>
          ) : (
            <MetaPillTrigger disabled={busy}>
              <IconTag className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {labelCount > 0
                  ? `${labelCount} label${labelCount === 1 ? "" : "s"}`
                  : "Labels"}
              </span>
            </MetaPillTrigger>
          )
        }
      >
        <CommandEmpty>No labels found.</CommandEmpty>
        <CommandGroup>
          {labels.map((l) => {
            const checked = local.labels.some((x) => x.id === l.id)
            return (
              <CommandItem
                key={l.id}
                value={l.name}
                disabled={busy}
                onSelect={() => void toggleLabel(l.id)}
                className="gap-2"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: labelDotColor(l.name) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <Check show={checked} />
              </CommandItem>
            )
          })}
        </CommandGroup>
      </MetaMenu>

      {cycle?.enabled && cycle.currentNumber != null ? (
        inCycle ? (
          <MetaPillTrigger
            disabled={busy}
            title={`Remove from cycle ${local.cycleNumber}`}
            onClick={(e) => {
              e.stopPropagation()
              void toggleCycle()
            }}
            className={cn(
              isRow &&
                "h-6 gap-1 rounded-full border-border/80 bg-transparent px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <CycleIcon active />
            <span className="tabular-nums">{local.cycleNumber}</span>
          </MetaPillTrigger>
        ) : (
          <MetaIconTrigger
            disabled={busy}
            title={cycleLabel}
            onClick={(e) => {
              e.stopPropagation()
              void toggleCycle()
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <CycleIcon active={false} />
          </MetaIconTrigger>
        )
      ) : null}
    </div>
  )
}

/** Detail-view pill row (status / priority / assignee / project / labels). */
export function IssueMetadataPills({
  issue,
  statuses,
  members,
  projects,
  labels,
  cycle,
  className,
  onUpdated,
}: {
  issue: IssueMetadataValue
  statuses: MetadataStatus[]
  members: MetadataMember[]
  projects: MetadataProject[]
  labels: MetadataLabel[]
  cycle?: IssueCycleOption
  className?: string
  onUpdated?: (next: IssueMetadataValue) => void
}) {
  return (
    <IssueMetadataFields
      issue={issue}
      options={{ statuses, members, projects, labels, cycle }}
      onUpdated={onUpdated}
      className={className}
      variant="pills"
    />
  )
}
