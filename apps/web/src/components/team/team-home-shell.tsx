import { IconStar } from "@tabler/icons-react"
import {
  EntityTabNav,
  type EntityTab,
} from "@/components/shared/entity-tab-nav"

type TeamHomeShellProps = {
  teamId: string
  teamName: string
  teamIdentifier: string | null
  activeTab: "overview" | "documents"
  actions?: React.ReactNode
  children: React.ReactNode
}

const tabs: EntityTab<"overview" | "documents" | "loop">[] = [
  { id: "overview", label: "Overview", to: "/team/$teamId" },
  { id: "documents", label: "Documents", to: "/team/$teamId/documents" },
  { id: "loop", label: "Loop", to: "/team/$teamId", disabled: true },
]

export function TeamHomeShell({
  teamId,
  teamName,
  teamIdentifier,
  activeTab,
  actions,
  children,
}: TeamHomeShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-4 pt-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">{teamName}</h1>
          {teamIdentifier ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {teamIdentifier}
            </span>
          ) : null}
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Favorite team"
            disabled
          >
            <IconStar className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pb-3">
          <EntityTabNav
            tabs={tabs}
            activeTab={activeTab}
            params={{ teamId }}
          />
          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 lg:px-6">{children}</div>
    </div>
  )
}
