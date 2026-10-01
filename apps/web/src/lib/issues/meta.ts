export function formatIssueKey(
  identifier: string | null | undefined,
  number: number,
  pad = 4
) {
  const prefix = identifier?.trim() || "ISS"
  return `${prefix.toUpperCase()}-${String(number).padStart(pad, "0")}`
}

export type MetadataStatus = {
  id: string
  name: string
  category: string
  sortOrder: number
}

export type MetadataMember = {
  userId: string
  name: string
  image: string | null
}

export type MetadataProject = {
  id: string
  name: string
}

export type MetadataLabel = {
  id: string
  name: string
}

export type IssueMetadataValue = {
  id: string
  teamId: string
  statusId: string | null
  statusName: string | null
  statusCategory: string | null
  statusSortOrder?: number | null
  priority: number | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeImage: string | null
  projectId: string | null
  projectName: string | null
  labels: { id: string; name: string }[]
  cycleNumber?: number | null
}

export type IssueCycleOption = {
  enabled: boolean
  currentNumber: number | null
}

export function issueMetadataFingerprint(issue: IssueMetadataValue) {
  return [
    issue.id,
    issue.statusId,
    issue.statusName,
    issue.statusCategory,
    issue.statusSortOrder,
    issue.priority,
    issue.assigneeId,
    issue.assigneeName,
    issue.projectId,
    issue.projectName,
    issue.cycleNumber ?? "",
    issue.labels.map((l) => l.id).join(","),
  ].join("|")
}
