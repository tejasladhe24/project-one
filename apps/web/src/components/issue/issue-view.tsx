import * as React from "react"
import { IconDots, IconStar } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { MarkdownEditor } from "@/components/markdown-editor"
import {
  IssueMetadataPills,
  type IssueMetadataValue,
  type MetadataLabel,
  type MetadataMember,
  type MetadataProject,
  type MetadataStatus,
} from "@/components/issue/issue-metadata-fields"
import { IssueActivity } from "@/components/team/issue-activity"
import { useIssueMetadataOptions } from "@/hooks/issues/use-issue-metadata-options"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { getCurrentCycleNumber } from "@/lib/cycles/dates"
import { formatIssueKey } from "@/lib/issues/meta"
import { updateIssue } from "@/lib/issues"

export type IssueViewData = {
  id: string
  number: number
  title: string
  description: string | null
  priority: number | null
  teamId: string
  teamName?: string | null
  teamIdentifier: string | null
  statusId: string | null
  statusName: string | null
  statusCategory: string | null
  statusSortOrder?: number | null
  projectId: string | null
  projectName: string | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeImage: string | null
  labels: { id: string; name: string }[]
  cycleNumber?: number | null
  cyclesEnabled?: boolean
  cycleDurationWeeks?: number
  cycleStartDay?: number
  cyclesOrigin?: Date | string | null
}

type IssueViewProps = {
  issue: IssueViewData
  currentUserId?: string | null
  /** Preloaded options (triage). When omitted, options load by team. */
  statuses?: MetadataStatus[]
  members?: MetadataMember[]
  projects?: MetadataProject[]
  labels?: MetadataLabel[]
  className?: string
  onUpdated?: (next: IssueMetadataValue & { description?: string | null }) => void
}

export function IssueView({
  issue: issueProp,
  currentUserId,
  statuses: statusesProp,
  members: membersProp,
  projects: projectsProp,
  labels: labelsProp,
  className,
  onUpdated,
}: IssueViewProps) {
  const { mutate, pending: saving } = useServerMutation()
  const [issue, setIssue] = React.useState(issueProp)
  const [activityKey, setActivityKey] = React.useState(0)
  const [description, setDescription] = React.useState(
    issueProp.description ?? ""
  )

  const needsOptions =
    !statusesProp || !membersProp || !projectsProp || !labelsProp
  const { byTeam, projects: loadedProjects, labels: loadedLabels } =
    useIssueMetadataOptions(needsOptions ? [issue.teamId] : [])

  const statuses =
    statusesProp ?? byTeam[issue.teamId]?.statuses ?? []
  const members = membersProp ?? byTeam[issue.teamId]?.members ?? []
  const projects = projectsProp ?? loadedProjects
  const labels = labelsProp ?? loadedLabels

  React.useEffect(() => {
    setIssue(issueProp)
    setDescription(issueProp.description ?? "")
  }, [issueProp])

  async function saveDescription() {
    const next = description.trim()
    const prev = (issue.description ?? "").trim()
    if (next === prev) return
    try {
      await mutate(
        () =>
          updateIssue({
            data: {
              teamId: issue.teamId,
              issueId: issue.id,
              description: next || null,
            },
          }),
        { errorMessage: "Could not save description" }
      )
      setIssue((prevIssue) => ({ ...prevIssue, description: next || null }))
      setActivityKey((k) => k + 1)
      onUpdated?.({
        id: issue.id,
        teamId: issue.teamId,
        statusId: issue.statusId,
        statusName: issue.statusName,
        statusCategory: issue.statusCategory,
        statusSortOrder: issue.statusSortOrder,
        priority: issue.priority,
        assigneeId: issue.assigneeId,
        assigneeName: issue.assigneeName,
        assigneeImage: issue.assigneeImage,
        projectId: issue.projectId,
        projectName: issue.projectName,
        labels: issue.labels,
        description: next || null,
      })
    } catch {
      // toast handled by useServerMutation
    }
  }

  function handleMetadataUpdated(next: IssueMetadataValue) {
    setIssue((prev) => ({
      ...prev,
      statusId: next.statusId,
      statusName: next.statusName,
      statusCategory: next.statusCategory,
      statusSortOrder: next.statusSortOrder,
      priority: next.priority,
      assigneeId: next.assigneeId,
      assigneeName: next.assigneeName,
      assigneeImage: next.assigneeImage,
      projectId: next.projectId,
      projectName: next.projectName,
      labels: next.labels,
      cycleNumber: next.cycleNumber ?? null,
    }))
    setActivityKey((k) => k + 1)
    onUpdated?.(next)
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col p-4", className)}>
      <div className="flex flex-col gap-4">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatIssueKey(issue.teamIdentifier, issue.number)}
              </span>
              {issue.teamName ? (
                <span className="text-muted-foreground">· {issue.teamName}</span>
              ) : null}
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {issue.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" size="icon-sm" variant="ghost" disabled>
              <IconStar />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" disabled>
              <IconDots />
            </Button>
          </div>
        </div>

        <IssueMetadataPills
          className="mb-4"
          issue={{
            id: issue.id,
            teamId: issue.teamId,
            statusId: issue.statusId,
            statusName: issue.statusName,
            statusCategory: issue.statusCategory,
            statusSortOrder: issue.statusSortOrder,
            priority: issue.priority,
            assigneeId: issue.assigneeId,
            assigneeName: issue.assigneeName,
            assigneeImage: issue.assigneeImage,
            projectId: issue.projectId,
            projectName: issue.projectName,
            labels: issue.labels,
            cycleNumber: issue.cycleNumber ?? null,
          }}
          statuses={statuses}
          members={members}
          projects={projects}
          labels={labels}
          cycle={
            issue.cyclesEnabled
              ? {
                  enabled: true,
                  currentNumber: getCurrentCycleNumber({
                    cyclesEnabled: true,
                    cycleDurationWeeks: issue.cycleDurationWeeks ?? 1,
                    cycleStartDay: issue.cycleStartDay ?? 1,
                    cyclesOrigin: issue.cyclesOrigin ?? null,
                  }),
                }
              : undefined
          }
          onUpdated={handleMetadataUpdated}
        />
      </div>
      <Separator />

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          onBlur={() => void saveDescription()}
          placeholder="Add a description…"
          disabled={saving}
          className="max-w-4xl"
        />

        <Separator className="my-6" />
        <IssueActivity
          teamId={issue.teamId}
          issueId={issue.id}
          currentUserId={currentUserId}
          refreshKey={activityKey}
          className="max-w-4xl pb-8"
        />
      </div>
    </div>
  )
}
