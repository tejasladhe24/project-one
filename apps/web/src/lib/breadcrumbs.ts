import type { ReactNode } from "react"

export type AppBreadcrumb = {
  label: string
  /** When set, crumb is a link. Omit for the current page. */
  to?: string
  params?: Record<string, string>
  search?: Record<string, string | undefined>
  icon?: ReactNode
}

type MatchLike = {
  routeId: string
  pathname: string
  params: Record<string, unknown>
  loaderData?: unknown
  search?: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function stringParam(
  params: Record<string, unknown>,
  key: string
): string | undefined {
  const value = params[key]
  return typeof value === "string" ? value : undefined
}

/**
 * Build header breadcrumbs from the active route matches + search.
 * Uses loader data when present (team/project/issue names).
 */
export function buildBreadcrumbs(
  matches: MatchLike[],
  search: Record<string, unknown> = {}
): AppBreadcrumb[] {
  const leaf = matches[matches.length - 1]
  if (!leaf) return [{ label: "Home", to: "/" }]

  const routeId = leaf.routeId
  const params = leaf.params
  const data = asRecord(leaf.loaderData)

  if (routeId.includes("/issue/$issueId")) {
    const issue = asRecord(data?.issue)
    const title = typeof issue?.title === "string" ? issue.title : "Issue"
    const number = typeof issue?.number === "number" ? issue.number : undefined
    const teamIdentifier =
      typeof issue?.teamIdentifier === "string" ? issue.teamIdentifier : null
    const key =
      number != null
        ? `${(teamIdentifier ?? "ISS").toUpperCase()}-${String(number).padStart(4, "0")}`
        : null
    return [
      { label: "Issues", to: "/issues" },
      { label: key ? `${key} · ${title}` : title },
    ]
  }

  if (routeId.includes("/project/$id")) {
    const projectMatch = [...matches]
      .reverse()
      .find((m) => m.routeId === "/(app)/_/project/$id")
    const projectData = asRecord(projectMatch?.loaderData)
    const project = asRecord(projectData?.project) ?? asRecord(data?.project)
    const name = typeof project?.name === "string" ? project.name : "Project"
    return [{ label: "Projects", to: "/projects" }, { label: name }]
  }

  if (routeId.includes("/team/$teamId")) {
    const teamMatch = [...matches]
      .reverse()
      .find(
        (m) =>
          m.routeId === "/(app)/_/team/$teamId" ||
          m.routeId.includes("/team/$teamId/")
      )
    const teamData = asRecord(teamMatch?.loaderData) ?? data
    const team = asRecord(teamData?.team) ?? teamData
    const teamName =
      typeof team?.name === "string"
        ? team.name
        : typeof teamData?.teamName === "string"
          ? (teamData.teamName as string)
          : "Team"
    const teamId =
      stringParam(params, "teamId") ??
      stringParam(teamMatch?.params ?? {}, "teamId")
    const crumbs: AppBreadcrumb[] = teamId
      ? [
          { label: "Teams", to: "/teams" },
          {
            label: teamName,
            to: "/team/$teamId",
            params: { teamId },
          },
        ]
      : [{ label: teamName }]

    if (routeId.includes("/triage")) crumbs.push({ label: "Triage" })
    else if (routeId.includes("/cycles")) crumbs.push({ label: "Cycles" })
    else if (routeId.includes("/projects")) {
      crumbs.push({
        label: "Projects",
        ...(teamId
          ? {
              to: "/team/$teamId/projects",
              params: { teamId },
            }
          : {}),
      })
    } else if (routeId.includes("/documents")) {
      crumbs.push({
        label: "Documents",
        ...(teamId
          ? {
              to: "/team/$teamId/documents",
              params: { teamId },
            }
          : {}),
      })
      if (stringParam(params, "documentId")) {
        const document = asRecord(data?.document)
        crumbs.push({
          label:
            typeof document?.title === "string" ? document.title : "Document",
        })
      }
    } else if (routeId.includes("/settings")) {
      crumbs.push({ label: "Settings" })
      if (routeId.includes("/labels")) crumbs.push({ label: "Labels" })
      else if (routeId.includes("/statuses")) crumbs.push({ label: "Statuses" })
      else if (routeId.includes("/members")) crumbs.push({ label: "Members" })
      else if (routeId.includes("/general")) crumbs.push({ label: "General" })
      else if (routeId.includes("/templates"))
        crumbs.push({ label: "Templates" })
      else if (routeId.includes("/cycles")) crumbs.push({ label: "Cycles" })
    }
    return crumbs
  }

  if (routeId.includes("/issues")) {
    const teamId =
      typeof search.team_id === "string" ? search.team_id : undefined
    const teamName =
      typeof data?.teamName === "string" ? data.teamName : undefined
    if (teamId) {
      return [
        {
          label: teamName ?? "Team",
          to: "/team/$teamId",
          params: { teamId },
        },
        { label: "Issues" },
      ]
    }
    return [{ label: "My Issues" }]
  }

  if (routeId.includes("/inbox")) return [{ label: "Inbox" }]
  if (routeId.includes("/projects")) return [{ label: "Projects" }]
  if (routeId.includes("/teams")) return [{ label: "Teams" }]
  if (routeId.includes("/members")) return [{ label: "Members" }]
  if (routeId.endsWith("/_") || routeId.endsWith("/index")) {
    return [{ label: "Home" }]
  }

  const segment = leaf.pathname.split("/").filter(Boolean)[0]
  if (!segment) return [{ label: "Home", to: "/" }]
  return [
    {
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
    },
  ]
}
