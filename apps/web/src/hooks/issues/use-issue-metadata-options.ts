import * as React from "react"
import { listLabels } from "@/lib/labels"
import { listProjects } from "@/lib/projects"
import { listStatuses } from "@/lib/statuses"
import { listTeamMembersDetailed } from "@/lib/teams"
import type {
  MetadataLabel,
  MetadataMember,
  MetadataProject,
  MetadataStatus,
} from "@/lib/issues/meta"

export type TeamMetadataOptions = {
  statuses: MetadataStatus[]
  members: MetadataMember[]
}

export function useIssueMetadataOptions(teamIds: string[]) {
  const [byTeam, setByTeam] = React.useState<
    Record<string, TeamMetadataOptions>
  >({})
  const [projects, setProjects] = React.useState<MetadataProject[]>([])
  const [labels, setLabels] = React.useState<MetadataLabel[]>([])
  const [loading, setLoading] = React.useState(false)

  const key = teamIds.slice().sort().join(",")

  React.useEffect(() => {
    let cancelled = false
    const ids = key ? key.split(",").filter(Boolean) : []

    async function load() {
      setLoading(true)
      try {
        const [projectRows, labelRows, ...teamBundles] = await Promise.all([
          listProjects(),
          listLabels(),
          ...ids.map(async (teamId) => {
            const [statuses, members] = await Promise.all([
              listStatuses({ data: { teamId } }),
              listTeamMembersDetailed({ data: { teamId } }),
            ])
            return {
              teamId,
              statuses: statuses.map((s) => ({
                id: s.id,
                name: s.name,
                category: s.category,
                sortOrder: s.sortOrder,
              })),
              members: members.map((m) => ({
                userId: m.userId,
                name: m.name,
                image: m.image,
              })),
            }
          }),
        ])

        if (cancelled) return

        setProjects(projectRows.map((p) => ({ id: p.id, name: p.name })))
        setLabels(labelRows.map((l) => ({ id: l.id, name: l.name })))

        const next: Record<string, TeamMetadataOptions> = {}
        for (const bundle of teamBundles) {
          next[bundle.teamId] = {
            statuses: bundle.statuses,
            members: bundle.members,
          }
        }
        setByTeam(next)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [key])

  return { byTeam, projects, labels, loading }
}
