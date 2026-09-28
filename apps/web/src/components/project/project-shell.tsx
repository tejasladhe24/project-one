import * as React from "react"
import { IconBox, IconCalendar, IconCheck, IconUser } from "@tabler/icons-react"
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { cn } from "@workspace/ui/lib/utils"
import { MetaMenu, MetaPillTrigger } from "@/components/issue/meta-menu"
import { PriorityIcon } from "@/components/issue/priority-icon"
import {
  ProjectProperties,
  type ProjectMetaOptions,
} from "@/components/project/project-properties"
import {
  EntityTabNav,
  type EntityTab,
} from "@/components/shared/entity-tab-nav"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { getInitials, ISSUE_PRIORITIES, priorityLabel } from "@/lib/issues/meta"
import {
  PROJECT_STATUSES,
  formatProjectShortDate,
  isProjectPeriodUnset,
  projectStatusDotClass,
  projectStatusLabel,
  suggestedProjectPeriod,
  toProjectDateInputValue,
  updateProject,
} from "@/lib/projects"

export type ProjectDetail = {
  id: string
  name: string
  description: string | null
  status: string
  priority: number
  leadId: string | null
  leadName: string | null
  leadImage: string | null
  startDate: Date | string | null
  targetDate: Date | string
  issuesCount: number
  progress: number
  createdAt: Date | string
  updatedAt: Date | string
  members: {
    userId: string
    name: string
    email: string
    image: string | null
  }[]
  teams: {
    teamId: string
    name: string
    identifier: string
  }[]
  labels: {
    id: string
    name: string
  }[]
}

type ProjectShellProps = {
  project: ProjectDetail
  activeTab: "overview" | "activity" | "issues"
  children: React.ReactNode
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

function periodFormDefaults(project: ProjectDetail) {
  const suggestion = suggestedProjectPeriod()
  return {
    startDate: isProjectPeriodUnset(project.startDate)
      ? suggestion.startInput
      : toProjectDateInputValue(project.startDate),
    targetDate: isProjectPeriodUnset(project.startDate)
      ? suggestion.targetInput
      : toProjectDateInputValue(project.targetDate) || suggestion.targetInput,
  }
}

/** Interactive property pills shown under the project hero. */
export function ProjectPropertyPills({
  project,
  options,
}: {
  project: ProjectDetail
  options: ProjectMetaOptions
}) {
  const { mutate, pending: busy } = useServerMutation()
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [priorityOpen, setPriorityOpen] = React.useState(false)
  const [leadOpen, setLeadOpen] = React.useState(false)
  const [datesOpen, setDatesOpen] = React.useState(false)
  const defaults = periodFormDefaults(project)
  const [startDate, setStartDate] = React.useState(defaults.startDate)
  const [targetDate, setTargetDate] = React.useState(defaults.targetDate)

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

  async function patch(
    data: {
      status?: "backlog" | "planned" | "in_progress" | "completed" | "canceled"
      priority?: number
      leadId?: string | null
      startDate?: string | null
      targetDate?: string
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
      // toast handled by useServerMutation
    }
  }

  const periodUnset = isProjectPeriodUnset(project.startDate)
  const suggestion = suggestedProjectPeriod()
  const pillStart = periodUnset
    ? suggestion.startDate
    : project.startDate
  const pillTarget = periodUnset
    ? suggestion.targetDate
    : project.targetDate

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MetaMenu
        open={statusOpen}
        onOpenChange={setStatusOpen}
        placeholder="Change status…"
        trigger={
          <MetaPillTrigger disabled={busy}>
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                projectStatusDotClass(project.status)
              )}
            />
            {projectStatusLabel(project.status)}
          </MetaPillTrigger>
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

      <MetaMenu
        open={priorityOpen}
        onOpenChange={setPriorityOpen}
        placeholder="Change priority…"
        trigger={
          <MetaPillTrigger disabled={busy}>
            <PriorityIcon priority={project.priority} />
            {priorityLabel(project.priority)}
          </MetaPillTrigger>
        }
      >
        <CommandEmpty>No priority found.</CommandEmpty>
        <CommandGroup>
          {ISSUE_PRIORITIES.map((p) => (
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
              <Check show={project.priority === p.value} />
            </CommandItem>
          ))}
        </CommandGroup>
      </MetaMenu>

      <MetaMenu
        open={leadOpen}
        onOpenChange={setLeadOpen}
        placeholder="Set lead…"
        trigger={
          <MetaPillTrigger disabled={busy}>
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
                {project.leadName.split(" ")[0]}
              </>
            ) : (
              <>
                <IconUser className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Add lead</span>
              </>
            )}
          </MetaPillTrigger>
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
              onSelect={() =>
                void patch({ leadId: m.userId }, () => setLeadOpen(false))
              }
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

      <Popover open={datesOpen} onOpenChange={openDates}>
        <PopoverTrigger
          render={
            <MetaPillTrigger disabled={busy}>
              <IconCalendar className="size-3.5 text-muted-foreground" />
              <span className={periodUnset ? "text-muted-foreground" : undefined}>
                {formatProjectShortDate(pillStart)} →{" "}
                {formatProjectShortDate(pillTarget)}
              </span>
            </MetaPillTrigger>
          }
        />
        <PopoverContent align="start" className="w-64 gap-3 p-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pill-start-date" className="text-xs">
              Start date
            </Label>
            <Input
              id="pill-start-date"
              type="date"
              value={startDate}
              disabled={busy}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pill-target-date" className="text-xs">
              Target date
            </Label>
            <Input
              id="pill-target-date"
              type="date"
              value={targetDate}
              disabled={busy}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy || !targetDate}
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
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
    </div>
  )
}

const tabs: EntityTab<"overview" | "activity" | "issues">[] = [
  { id: "overview", label: "Overview", to: "/project/$id" },
  { id: "activity", label: "Activity", to: "/project/$id/activity" },
  { id: "issues", label: "Issues", to: "/project/$id/issues" },
]

export function ProjectShell({
  project,
  activeTab,
  children,
}: ProjectShellProps) {
  return (
    <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 pt-2 lg:px-6">
        <div className="pb-2">
          <EntityTabNav
            tabs={tabs}
            activeTab={activeTab}
            params={{ id: project.id }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

export function ProjectHero({ project }: { project: ProjectDetail }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
        <IconBox className="size-5" />
      </div>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
      </div>
    </div>
  )
}

export function ProjectAside({
  project,
  options,
}: {
  project: ProjectDetail
  options: ProjectMetaOptions
}) {
  return (
    <aside className="h-full min-h-0 overflow-y-auto px-3 py-4">
      <ProjectProperties project={project} options={options} />
    </aside>
  )
}

/** Main content + properties aside with a default 70/30 resizable split. */
export function ProjectSplitLayout({
  project,
  options,
  children,
}: {
  project: ProjectDetail
  options: ProjectMetaOptions
  children: React.ReactNode
}) {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 h-full w-full"
    >
      <ResizablePanel defaultSize="80" minSize="45" className="min-w-0">
        <div className="h-full min-h-0 overflow-y-auto">{children}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize="20"
        minSize="20"
        maxSize="40"
        className="min-w-0 border-l"
      >
        <ProjectAside project={project} options={options} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
