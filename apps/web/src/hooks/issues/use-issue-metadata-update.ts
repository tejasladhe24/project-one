import * as React from "react"
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  issueMetadataFingerprint,
  type IssueMetadataValue,
  type MetadataLabel,
  type MetadataMember,
  type MetadataProject,
  type MetadataStatus,
} from "@/lib/issues/meta"
import { updateIssue } from "@/lib/issues"

export type IssueMetadataPatch = {
  priority?: number
  statusId?: string | null
  assigneeId?: string | null
  projectId?: string | null
  labelIds?: string[]
  cycleNumber?: number | null
}

export function applyOptimisticMetadata(
  current: IssueMetadataValue,
  patch: IssueMetadataPatch,
  options: {
    statuses: MetadataStatus[]
    members: MetadataMember[]
    projects: MetadataProject[]
    labels: MetadataLabel[]
  }
): IssueMetadataValue {
  const next = { ...current }

  if (patch.priority !== undefined) {
    next.priority = patch.priority
  }

  if (patch.statusId !== undefined) {
    const status = options.statuses.find((s) => s.id === patch.statusId)
    next.statusId = patch.statusId
    next.statusName = status?.name ?? null
    next.statusCategory = status?.category ?? null
    next.statusSortOrder = status?.sortOrder ?? null
  }

  if (patch.assigneeId !== undefined) {
    if (patch.assigneeId == null) {
      next.assigneeId = null
      next.assigneeName = null
      next.assigneeImage = null
    } else {
      const member = options.members.find((m) => m.userId === patch.assigneeId)
      next.assigneeId = patch.assigneeId
      next.assigneeName = member?.name ?? next.assigneeName
      next.assigneeImage = member?.image ?? null
    }
  }

  if (patch.projectId !== undefined) {
    if (patch.projectId == null) {
      next.projectId = null
      next.projectName = null
    } else {
      const project = options.projects.find((p) => p.id === patch.projectId)
      next.projectId = patch.projectId
      next.projectName = project?.name ?? next.projectName
    }
  }

  if (patch.labelIds !== undefined) {
    next.labels = options.labels
      .filter((l) => patch.labelIds!.includes(l.id))
      .map((l) => ({ id: l.id, name: l.name }))
  }

  if (patch.cycleNumber !== undefined) {
    next.cycleNumber = patch.cycleNumber
  }

  return next
}

export function useIssueMetadataUpdate(
  issue: IssueMetadataValue,
  options: {
    statuses: MetadataStatus[]
    members: MetadataMember[]
    projects: MetadataProject[]
    labels: MetadataLabel[]
  },
  onUpdated?: (next: IssueMetadataValue) => void
) {
  const { mutate, pending: busy } = useServerMutation()
  const [local, setLocal] = React.useState(issue)
  const fingerprint = issueMetadataFingerprint(issue)

  React.useEffect(() => {
    setLocal(issue)
  }, [fingerprint, issue])

  async function patch(
    data: IssueMetadataPatch,
    close?: () => void
  ): Promise<IssueMetadataValue | null> {
    if (busy) return null
    const previous = local
    const optimistic = applyOptimisticMetadata(local, data, options)
    setLocal(optimistic)
    close?.()
    try {
      const next = await mutate(
        () =>
          updateIssue({
            data: { teamId: issue.teamId, issueId: issue.id, ...data },
          }),
        { errorMessage: "Failed to update" }
      )
      setLocal(next)
      onUpdated?.(next)
      return next
    } catch {
      setLocal(previous)
      return null
    }
  }

  async function toggleLabel(labelId: string) {
    const selected = new Set(local.labels.map((l) => l.id))
    if (selected.has(labelId)) selected.delete(labelId)
    else selected.add(labelId)
    return patch({ labelIds: [...selected] })
  }

  return { local, busy, patch, toggleLabel }
}
