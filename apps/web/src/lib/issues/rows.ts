import { parseEstimateType, type EstimateType } from "@/lib/estimates"
import type { listIssues } from "@/lib/issues/server"

export type IssueRow = {
  id: string
  number: number
  title: string
  description: string | null
  priority: number | null
  dueDate: string | null
  estimatedHours: number | null
  cycleNumber: number | null
  projectId: string | null
  projectName: string | null
  teamId: string
  teamName: string | null
  teamIdentifier: string | null
  estimateType: EstimateType
  allowZeroEstimates: boolean
  extendedEstimateScale: boolean
  countUnestimatedIssues: boolean
  cyclesEnabled: boolean
  cycleDurationWeeks: number
  cycleStartDay: number
  cyclesOrigin: string | null
  statusId: string | null
  statusName: string | null
  statusCategory: string | null
  statusSortOrder: number | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeImage: string | null
  labels: { id: string; name: string }[]
  createdAt: string
}

export function toIssueRows(
  data: Awaited<ReturnType<typeof listIssues>> | null | undefined
): IssueRow[] {
  if (!data) return []

  return data.map((item) => ({
    id: item.id,
    number: item.number,
    title: item.title,
    description: item.description ?? null,
    priority: item.priority,
    dueDate: item.dueDate
      ? typeof item.dueDate === "string"
        ? item.dueDate
        : new Date(item.dueDate).toISOString()
      : null,
    estimatedHours: item.estimatedHours,
    cycleNumber: item.cycleNumber ?? null,
    projectId: item.projectId,
    projectName: item.projectName,
    teamId: item.teamId,
    teamName: item.teamName,
    teamIdentifier: item.teamIdentifier,
    estimateType: parseEstimateType(item.estimateType),
    allowZeroEstimates: item.allowZeroEstimates,
    extendedEstimateScale: item.extendedEstimateScale,
    countUnestimatedIssues: item.countUnestimatedIssues,
    cyclesEnabled: item.cyclesEnabled,
    cycleDurationWeeks: item.cycleDurationWeeks,
    cycleStartDay: item.cycleStartDay,
    cyclesOrigin: item.cyclesOrigin
      ? typeof item.cyclesOrigin === "string"
        ? item.cyclesOrigin
        : new Date(item.cyclesOrigin).toISOString()
      : null,
    statusId: item.statusId,
    statusName: item.statusName,
    statusCategory: item.statusCategory,
    statusSortOrder: item.statusSortOrder,
    assigneeId: item.assigneeId,
    assigneeName: item.assigneeName,
    assigneeImage: item.assigneeImage,
    labels: item.labels,
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : new Date(item.createdAt).toISOString(),
  }))
}
