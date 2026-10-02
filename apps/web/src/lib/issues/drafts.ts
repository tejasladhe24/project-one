export const ISSUE_DRAFTS_STORAGE_KEY = "issue-drafts:v1"

export type IssueDraftPriority = "0" | "1" | "2" | "3" | "4"

export type IssueDraftValues = {
  title: string
  teamId: string
  projectId: string
  priority: IssueDraftPriority
  description: string
}

export type IssueDraft = IssueDraftValues & {
  id: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

function isPriority(value: unknown): value is IssueDraftPriority {
  return (
    value === "0" ||
    value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4"
  )
}

function parseDraft(raw: unknown): IssueDraft | null {
  if (!raw || typeof raw !== "object") return null
  const data = raw as Record<string, unknown>

  if (typeof data.id !== "string" || !data.id) return null
  if (typeof data.organizationId !== "string" || !data.organizationId) {
    return null
  }
  if (typeof data.title !== "string") return null
  if (typeof data.teamId !== "string") return null
  if (typeof data.projectId !== "string") return null
  if (!isPriority(data.priority)) return null
  if (typeof data.description !== "string") return null
  if (typeof data.createdAt !== "string") return null
  if (typeof data.updatedAt !== "string") return null

  return {
    id: data.id,
    organizationId: data.organizationId,
    title: data.title,
    teamId: data.teamId,
    projectId: data.projectId,
    priority: data.priority,
    description: data.description,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function readAllDrafts(): IssueDraft[] {
  if (typeof window === "undefined") return []

  try {
    const stored = window.localStorage.getItem(ISSUE_DRAFTS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const draft = parseDraft(item)
      return draft ? [draft] : []
    })
  } catch {
    return []
  }
}

function writeAllDrafts(drafts: IssueDraft[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      ISSUE_DRAFTS_STORAGE_KEY,
      JSON.stringify(drafts)
    )
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function listIssueDrafts(organizationId: string): IssueDraft[] {
  return readAllDrafts()
    .filter((draft) => draft.organizationId === organizationId)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getIssueDraft(
  organizationId: string,
  draftId: string
): IssueDraft | null {
  return (
    listIssueDrafts(organizationId).find((draft) => draft.id === draftId) ??
    null
  )
}

export function saveIssueDraft({
  organizationId,
  draftId,
  values,
}: {
  organizationId: string
  draftId?: string
  values: IssueDraftValues
}): IssueDraft {
  const now = new Date().toISOString()
  const all = readAllDrafts()
  const existing = draftId
    ? all.find(
        (draft) =>
          draft.id === draftId && draft.organizationId === organizationId
      )
    : undefined

  const next: IssueDraft = {
    id: existing?.id ?? crypto.randomUUID(),
    organizationId,
    title: values.title,
    teamId: values.teamId,
    projectId: values.projectId,
    priority: values.priority,
    description: values.description,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const others = all.filter((draft) => draft.id !== next.id)
  writeAllDrafts([...others, next])
  return next
}

export function deleteIssueDraft(organizationId: string, draftId: string) {
  const next = readAllDrafts().filter(
    (draft) =>
      !(draft.id === draftId && draft.organizationId === organizationId)
  )
  writeAllDrafts(next)
}

export function draftDisplayTitle(draft: Pick<IssueDraft, "title">) {
  const trimmed = draft.title.trim()
  return trimmed || "Untitled draft"
}

export function draftSummaryPreview(draft: Pick<IssueDraft, "description">) {
  const trimmed = draft.description.trim().replace(/\s+/g, " ")
  if (!trimmed) return "No description"
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed
}
