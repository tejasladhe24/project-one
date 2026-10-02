import * as React from "react"
import {
  ISSUE_DRAFTS_STORAGE_KEY,
  deleteIssueDraft,
  listIssueDrafts,
  saveIssueDraft,
  type IssueDraft,
  type IssueDraftValues,
} from "@/lib/issues/drafts"

export function useIssueDrafts(organizationId: string | null | undefined) {
  const [drafts, setDrafts] = React.useState<IssueDraft[]>([])
  const [ready, setReady] = React.useState(false)

  const refresh = React.useCallback(() => {
    if (!organizationId) {
      setDrafts([])
      return
    }
    setDrafts(listIssueDrafts(organizationId))
  }, [organizationId])

  React.useEffect(() => {
    refresh()
    setReady(true)
  }, [refresh])

  React.useEffect(() => {
    if (!ready) return

    function onStorage(event: StorageEvent) {
      if (event.key !== ISSUE_DRAFTS_STORAGE_KEY) return
      refresh()
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [ready, refresh])

  const saveDraft = React.useCallback(
    ({ draftId, values }: { draftId?: string; values: IssueDraftValues }) => {
      if (!organizationId) {
        throw new Error("No active organization")
      }
      const saved = saveIssueDraft({ organizationId, draftId, values })
      refresh()
      return saved
    },
    [organizationId, refresh]
  )

  const removeDraft = React.useCallback(
    (draftId: string) => {
      if (!organizationId) return
      deleteIssueDraft(organizationId, draftId)
      refresh()
    },
    [organizationId, refresh]
  )

  return { drafts, ready, refresh, saveDraft, removeDraft }
}
