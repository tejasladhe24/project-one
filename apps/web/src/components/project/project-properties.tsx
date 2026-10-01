import * as React from "react"
import {
  IconCalendar,
  IconCheck,
  IconTag,
  IconUser,
  IconUsers,
  IconUsersGroup,
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"
import { MetaMenu, MetaPillTrigger } from "@/components/issue/meta-menu"
import { PriorityIcon } from "@/components/issue/priority-icon"
import type { ProjectDetail } from "@/components/project/project-shell"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { PRIORITIES, priorityLabel } from "@/lib/shared/priority"
import { getInitials } from "@/lib/shared/string"
import {
  PROJECT_STATUSES,
  formatProjectShortDate,
  isProjectPeriodUnset,
  projectStatusDotClass,
  projectStatusLabel,
  resolveProjectPeriod,
  toProjectDateInputValue,
  updateProject,
} from "@/lib/projects"

const outlineTriggerClass =
  "max-w-full border-border bg-transparent text-foreground hover:bg-muted data-open:bg-muted"

function OutlineMetaTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <MetaPillTrigger className={cn(outlineTriggerClass, className)} {...props}>
      {children}
    </MetaPillTrigger>
  )
}

export type ProjectMetaMember = {
  userId: string
  name: string
  email: string
  image: string | null
}

export type ProjectMetaTeam = {
  teamId: string
  name: string
  identifier: string
}

export type ProjectMetaLabel = {
  id: string
  name: string
}

export type ProjectMetaOptions = {
  members: ProjectMetaMember[]
  teams: ProjectMetaTeam[]
  labels: ProjectMetaLabel[]
}

function Check({ show }: { show: boolean }) {
  return (
    <IconCheck
      className={cn(
        "size-3.5 shrink-0 text-foreground",
        show ? "opacity-100" : "opacity-0"
      )}
    />
  )
}

function formatShortDate(value: Date | string | null | undefined) {
  return formatProjectShortDate(value)
}

function toDateInputValue(value: Date | string | null | undefined) {
  return toProjectDateInputValue(value)
}

function periodFormDefaults(project: ProjectDetail) {
  const period = resolveProjectPeriod(project)
  return {
    startDate: toDateInputValue(period.startDate),
    targetDate: toDateInputValue(period.targetDate),
  }
}

function PropertyRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/40">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

type ProjectPropertiesProps = {
  project: ProjectDetail
  options: ProjectMetaOptions
}

export function ProjectProperties({
  project,
  options,
}: ProjectPropertiesProps) {
  const { mutate, pending: busy } = useServerMutation()
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [priorityOpen, setPriorityOpen] = React.useState(false)
  const [leadOpen, setLeadOpen] = React.useState(false)
  const [membersOpen, setMembersOpen] = React.useState(false)
  const [teamsOpen, setTeamsOpen] = React.useState(false)
  const [labelsOpen, setLabelsOpen] = React.useState(false)
  const [datesOpen, setDatesOpen] = React.useState(false)
  const dateDefaults = periodFormDefaults(project)
  const [startDate, setStartDate] = React.useState(dateDefaults.startDate)
  const [targetDate, setTargetDate] = React.useState(dateDefaults.targetDate)
  const datesPeriod = resolveProjectPeriod(project)
  const [memberIds, setMemberIds] = React.useState(() =>
    project.members.map((m) => m.userId)
  )
  const [teamIds, setTeamIds] = React.useState(() =>
    project.teams.map((t) => t.teamId)
  )
  const [labelIds, setLabelIds] = React.useState(() =>
    project.labels.map((l) => l.id)
  )

  React.useEffect(() => {
    const next = periodFormDefaults(project)
    setStartDate(next.startDate)
    setTargetDate(next.targetDate)
  }, [project.startDate, project.targetDate])

  function openDates(open: boolean) {
    if (open) {
      const next = periodFormDefaults(project)
      setStartDate(next.startDate)
      setTargetDate(next.targetDate)
    }
    setDatesOpen(open)
  }
  const membersKey = project.members
    .map((m) => m.userId)
    .slice()
    .sort()
    .join(",")
  const teamsKey = project.teams
    .map((t) => t.teamId)
    .slice()
    .sort()
    .join(",")
  const labelsKey = project.labels
    .map((l) => l.id)
    .slice()
    .sort()
    .join(",")

  React.useEffect(() => {
    setMemberIds(project.members.map((m) => m.userId))
  }, [project.id, membersKey])

  React.useEffect(() => {
    setTeamIds(project.teams.map((t) => t.teamId))
  }, [project.id, teamsKey])

  React.useEffect(() => {
    setLabelIds(project.labels.map((l) => l.id))
  }, [project.id, labelsKey])

  async function patch(
    data: {
      status?: "backlog" | "planned" | "in_progress" | "completed" | "canceled"
      priority?: number
      leadId?: string | null
      startDate?: string | null
      targetDate?: string
      memberIds?: string[]
      teamIds?: string[]
      labelIds?: string[]
    },
    onDone?: () => void
  ) {
    try {
      await mutate(
        () => updateProject({ data: { projectId: project.id, ...data } }),
        { errorMessage: "Could not update project" }
      )
      onDone?.()
    } catch {
      // Re-sync from server props on failure
      setMemberIds(project.members.map((m) => m.userId))
      setTeamIds(project.teams.map((t) => t.teamId))
      setLabelIds(project.labels.map((l) => l.id))
    }
  }

  function toggleMember(userId: string) {
    // Lead must remain a project member.
    if (project.leadId === userId && memberIds.includes(userId)) {
      toast.message("Project lead must stay a member")
      return
    }
    const next = memberIds.includes(userId)
      ? memberIds.filter((id) => id !== userId)
      : [...memberIds, userId]
    setMemberIds(next)
    void patch({ memberIds: next })
  }

  function toggleTeam(teamId: string) {
    const next = teamIds.includes(teamId)
      ? teamIds.filter((id) => id !== teamId)
      : [...teamIds, teamId]
    setTeamIds(next)
    void patch({ teamIds: next })
  }

  function toggleLabel(labelId: string) {
    const next = labelIds.includes(labelId)
      ? labelIds.filter((id) => id !== labelId)
      : [...labelIds, labelId]
    setLabelIds(next)
    void patch({ labelIds: next })
  }

  const selectedMembers = options.members.filter((m) =>
    memberIds.includes(m.userId)
  )
  const selectedTeams = options.teams.filter((t) => teamIds.includes(t.teamId))
  const selectedLabels = options.labels.filter((l) => labelIds.includes(l.id))

  const membersLabel =
    selectedMembers.length === 0
      ? "Add members"
      : selectedMembers.length === 1
        ? selectedMembers[0]!.name.split(" ")[0]
        : `${selectedMembers.length} members`

  const teamsLabel =
    selectedTeams.length === 0
      ? "Add team"
      : selectedTeams.map((t) => t.identifier || t.name).join(", ")

  const labelsLabel =
    selectedLabels.length === 0
      ? "Add label"
      : selectedLabels.map((l) => l.name).join(", ")

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-1">
        <span className="text-xs font-medium text-muted-foreground">
          Properties
        </span>
      </div>

      <PropertyRow label="Status">
        <MetaMenu
          open={statusOpen}
          onOpenChange={setStatusOpen}
          placeholder="Change status…"
          trigger={
            <OutlineMetaTrigger disabled={busy} className="max-w-full">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  projectStatusDotClass(project.status)
                )}
              />
              <span className="truncate">
                {projectStatusLabel(project.status)}
              </span>
            </OutlineMetaTrigger>
          }
        >
          <CommandEmpty>No status found.</CommandEmpty>
          <CommandGroup>
            {PROJECT_STATUSES.map((s) => (
              <CommandItem
                key={s.value}
                value={s.label}
                disabled={busy}
                onSelect={() =>
                  void patch({ status: s.value }, () => setStatusOpen(false))
                }
                className="gap-2"
              >
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    projectStatusDotClass(s.value)
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <Check show={project.status === s.value} />
              </CommandItem>
            ))}
          </CommandGroup>
        </MetaMenu>
      </PropertyRow>

      <PropertyRow label="Priority">
        <MetaMenu
          open={priorityOpen}
          onOpenChange={setPriorityOpen}
          placeholder="Change priority…"
          trigger={
            <OutlineMetaTrigger disabled={busy} className="max-w-full">
              <PriorityIcon priority={project.priority} />
              <span className="truncate">
                {priorityLabel(project.priority)}
              </span>
            </OutlineMetaTrigger>
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
                  void patch({ priority: p.value }, () =>
                    setPriorityOpen(false)
                  )
                }
                className="gap-2"
              >
                <PriorityIcon priority={p.value} />
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
                <Check show={project.priority === p.value} />
              </CommandItem>
            ))}
          </CommandGroup>
        </MetaMenu>
      </PropertyRow>

      <PropertyRow label="Lead">
        <MetaMenu
          open={leadOpen}
          onOpenChange={setLeadOpen}
          placeholder="Set lead…"
          trigger={
            <OutlineMetaTrigger disabled={busy} className="max-w-full">
              {project.leadName ? (
                <>
                  <Avatar className="size-4">
                    {project.leadImage ? (
                      <AvatarImage
                        src={project.leadImage}
                        alt={project.leadName}
                      />
                    ) : null}
                    <AvatarFallback className="text-[8px]">
                      {getInitials(project.leadName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {project.leadName.split(" ")[0]}
                  </span>
                </>
              ) : (
                <>
                  <IconUser className="size-3.5 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">
                    Add lead
                  </span>
                </>
              )}
            </OutlineMetaTrigger>
          }
        >
          <CommandEmpty>No people found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="No lead"
              disabled={busy}
              onSelect={() =>
                void patch({ leadId: null }, () => setLeadOpen(false))
              }
              className="gap-2"
            >
              <IconUser className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">No lead</span>
              <Check show={!project.leadId} />
            </CommandItem>
            {options.members.map((m) => (
              <CommandItem
                key={m.userId}
                value={`${m.name} ${m.email}`}
                disabled={busy}
                onSelect={() => {
                  if (!memberIds.includes(m.userId)) {
                    setMemberIds((ids) => [...ids, m.userId])
                  }
                  void patch({ leadId: m.userId }, () => setLeadOpen(false))
                }}
                className="gap-2"
              >
                <Avatar className="size-5">
                  {m.image ? <AvatarImage src={m.image} alt={m.name} /> : null}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <Check show={project.leadId === m.userId} />
              </CommandItem>
            ))}
          </CommandGroup>
        </MetaMenu>
      </PropertyRow>

      <PropertyRow label="Members">
        <MetaMenu
          open={membersOpen}
          onOpenChange={setMembersOpen}
          placeholder="Search people…"
          trigger={
            <OutlineMetaTrigger disabled={busy} className="max-w-full">
              {selectedMembers.length > 0 ? (
                <span className="flex items-center -space-x-1.5">
                  {selectedMembers.slice(0, 3).map((m) => (
                    <Avatar
                      key={m.userId}
                      className="size-4 ring-1 ring-background"
                    >
                      {m.image ? (
                        <AvatarImage src={m.image} alt={m.name} />
                      ) : null}
                      <AvatarFallback className="text-[7px]">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </span>
              ) : (
                <IconUsers className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "truncate",
                  selectedMembers.length === 0 && "text-muted-foreground"
                )}
              >
                {membersLabel}
              </span>
            </OutlineMetaTrigger>
          }
        >
          <CommandEmpty>No people found.</CommandEmpty>
          <CommandGroup heading="Select one or more">
            {options.members.map((m) => {
              const selected = memberIds.includes(m.userId)
              return (
                <CommandItem
                  key={m.userId}
                  value={`${m.name} ${m.email}`}
                  disabled={busy}
                  onSelect={() => toggleMember(m.userId)}
                  className="gap-2"
                >
                  <Avatar className="size-5">
                    {m.image ? (
                      <AvatarImage src={m.image} alt={m.name} />
                    ) : null}
                    <AvatarFallback className="text-[8px]">
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">
                    {m.name}
                    {project.leadId === m.userId ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        Lead
                      </span>
                    ) : null}
                  </span>
                  <Check show={selected} />
                </CommandItem>
              )
            })}
          </CommandGroup>
        </MetaMenu>
      </PropertyRow>

      <PropertyRow label="Dates">
        <Popover open={datesOpen} onOpenChange={openDates}>
          <PopoverTrigger
            render={
              <OutlineMetaTrigger disabled={busy} className="max-w-full" />
            }
          >
            <IconCalendar className="size-3.5 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "truncate",
                isProjectPeriodUnset(project.startDate) &&
                  "text-muted-foreground"
              )}
            >
              {formatShortDate(datesPeriod.startDate)}
              <span className="text-muted-foreground"> → </span>
              {formatShortDate(datesPeriod.targetDate)}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 gap-3 p-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-start-date" className="text-xs">
                Start date
              </Label>
              <Input
                id="project-start-date"
                type="date"
                value={startDate}
                disabled={busy}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-target-date" className="text-xs">
                Target date
              </Label>
              <Input
                id="project-target-date"
                type="date"
                value={targetDate}
                disabled={busy}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={busy || !targetDate}
              onClick={() =>
                void patch(
                  {
                    startDate: startDate || null,
                    targetDate,
                  },
                  () => setDatesOpen(false)
                )
              }
            >
              Save dates
            </button>
          </PopoverContent>
        </Popover>
      </PropertyRow>

      <PropertyRow label="Teams">
        <MetaMenu
          open={teamsOpen}
          onOpenChange={setTeamsOpen}
          placeholder="Search teams…"
          trigger={
            <OutlineMetaTrigger disabled={busy} className="max-w-full">
              <IconUsersGroup className="size-3.5 shrink-0 text-muted-foreground" />
              <span
                className={cn(
                  "truncate",
                  selectedTeams.length === 0 && "text-muted-foreground"
                )}
              >
                {teamsLabel}
              </span>
            </OutlineMetaTrigger>
          }
        >
          <CommandEmpty>No teams found.</CommandEmpty>
          <CommandGroup heading="Select one or more">
            {options.teams.map((t) => {
              const selected = teamIds.includes(t.teamId)
              return (
                <CommandItem
                  key={t.teamId}
                  value={`${t.name} ${t.identifier}`}
                  disabled={busy}
                  onSelect={() => toggleTeam(t.teamId)}
                  className="gap-2"
                >
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.identifier}
                  </span>
                  <Check show={selected} />
                </CommandItem>
              )
            })}
          </CommandGroup>
        </MetaMenu>
      </PropertyRow>

      <PropertyRow label="Labels">
        <MetaMenu
          open={labelsOpen}
          onOpenChange={setLabelsOpen}
          placeholder="Search labels…"
          trigger={
            <OutlineMetaTrigger disabled={busy} className="max-w-full">
              <IconTag className="size-3.5 shrink-0 text-muted-foreground" />
              <span
                className={cn(
                  "truncate",
                  selectedLabels.length === 0 && "text-muted-foreground"
                )}
              >
                {labelsLabel}
              </span>
            </OutlineMetaTrigger>
          }
        >
          <CommandEmpty>No labels found.</CommandEmpty>
          <CommandGroup heading="Select one or more">
            {options.labels.map((l) => {
              const selected = labelIds.includes(l.id)
              return (
                <CommandItem
                  key={l.id}
                  value={l.name}
                  disabled={busy}
                  onSelect={() => toggleLabel(l.id)}
                  className="gap-2"
                >
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <Check show={selected} />
                </CommandItem>
              )
            })}
          </CommandGroup>
        </MetaMenu>
      </PropertyRow>
    </div>
  )
}
