import { Link } from "@tanstack/react-router"
import {
  IconChevronRight,
  IconLock,
  IconSettings,
  IconTag,
  IconTemplate,
  IconUsers,
  IconBell,
  IconCircleDot,
  IconFolder,
  IconRepeat,
  IconGitBranch,
  IconInbox,
  IconCalendar,
  IconShield,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

type SettingsLink = {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  to?:
    | "/team/$teamId/settings/general"
    | "/team/$teamId/settings/members"
    | "/team/$teamId/settings/labels"
    | "/team/$teamId/settings/templates"
    | "/team/$teamId/settings/statuses"
    | "/team/$teamId/settings/cycles"
  meta?: string
  disabled?: boolean
}

type TeamSettingsHubProps = {
  teamId: string
  teamName: string
  memberCount: number
  labelCount: number
  statusCount: number
  templateCount: number
}

function SettingsRow({
  item,
  teamId,
}: {
  item: SettingsLink
  teamId: string
}) {
  const Icon = item.icon
  const content = (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{item.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.description}
        </div>
      </div>
      {item.meta ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {item.meta}
        </span>
      ) : null}
      <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  )

  if (item.disabled || !item.to) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 opacity-60">
        {content}
      </div>
    )
  }

  return (
    <Link
      to={item.to}
      params={{ teamId }}
      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
    >
      {content}
    </Link>
  )
}

export function TeamSettingsHub({
  teamId,
  teamName,
  memberCount,
  labelCount,
  statusCount,
  templateCount,
}: TeamSettingsHubProps) {
  const general: SettingsLink[] = [
    {
      title: "General",
      description: "Name, identifier, timezone, estimates, and broader settings",
      icon: IconSettings,
      to: "/team/$teamId/settings/general",
    },
    {
      title: "Access and permissions",
      description: "Manage team access and who in the team can take certain actions",
      icon: IconShield,
      disabled: true,
    },
    {
      title: "Members",
      description: "Manage team members",
      icon: IconUsers,
      to: "/team/$teamId/settings/members",
      meta: `${memberCount} member${memberCount === 1 ? "" : "s"}`,
    },
    {
      title: "Slack notifications",
      description: "Broadcast notifications to Slack",
      icon: IconBell,
      meta: "Off",
      disabled: true,
    },
  ]

  const content: SettingsLink[] = [
    {
      title: "Issue labels",
      description: "Labels available to this team's issues",
      icon: IconTag,
      to: "/team/$teamId/settings/labels",
      meta: `${labelCount} label${labelCount === 1 ? "" : "s"}`,
    },
    {
      title: "Project labels",
      description: "Labels available to this team's projects",
      icon: IconFolder,
      meta: "None",
      disabled: true,
    },
    {
      title: "Templates",
      description: "Pre-filled templates for issues, documents, and projects",
      icon: IconTemplate,
      to: "/team/$teamId/settings/templates",
      meta:
        templateCount > 0
          ? `${templateCount} template${templateCount === 1 ? "" : "s"}`
          : "None",
    },
    {
      title: "Recurring issues",
      description: "Automatically create issues on a schedule",
      icon: IconRepeat,
      meta: "None",
      disabled: true,
    },
  ]

  const workflow: SettingsLink[] = [
    {
      title: "Issue statuses",
      description: "Customize the statuses issues go through",
      icon: IconCircleDot,
      to: "/team/$teamId/settings/statuses",
      meta: `${statusCount} status${statusCount === 1 ? "" : "es"}`,
    },
    {
      title: "Project statuses",
      description: "Customize the statuses projects go through",
      icon: IconLock,
      meta: "None",
      disabled: true,
    },
    {
      title: "Workflows & automations",
      description: "Manage issue automations, git workflows and other workflows",
      icon: IconGitBranch,
      disabled: true,
    },
    {
      title: "Triage",
      description: "Streamline how you handle requests from outside your team",
      icon: IconInbox,
      disabled: true,
    },
    {
      title: "Cycles",
      description: "Focus your team over short, time-boxed windows",
      icon: IconCalendar,
      to: "/team/$teamId/settings/cycles",
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{teamName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accessible to all workspace members
          </p>
        </div>
        <Link
          to="/issues"
          search={{ team_id: teamId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Team overview
          <IconChevronRight className="size-4" />
        </Link>
      </div>

      <section className="overflow-hidden rounded-lg border">
        <div className="divide-y">
          {general.map((item) => (
            <SettingsRow key={item.title} item={item} teamId={teamId} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Issues, projects, and documents
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {content.map((item) => (
              <SettingsRow key={item.title} item={item} teamId={teamId} />
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Workflow
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {workflow.map((item) => (
              <SettingsRow key={item.title} item={item} teamId={teamId} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
