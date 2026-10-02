import * as React from "react"
import {
  IconDotsVertical,
  IconPencil,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react"
import {
  createColumnHelper,
  createSortedRowModel,
  FlexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  CreateIssueForm,
  type CreateIssueProjectOption,
  type CreateIssueTeamOption,
} from "@/components/issues/create-issue-form"
import { useIssueDrafts } from "@/hooks/use-issue-drafts"
import {
  draftDisplayTitle,
  draftSummaryPreview,
  type IssueDraft,
} from "@/lib/issues/drafts"

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, IssueDraft>()

const EMPTY_DRAFTS: IssueDraft[] = []

const priorityLabels: Record<IssueDraft["priority"], string> = {
  "0": "No priority",
  "1": "Urgent",
  "2": "High",
  "3": "Medium",
  "4": "Low",
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

type DraftsTableProps = {
  organizationId: string
  projects: CreateIssueProjectOption[]
  teams: CreateIssueTeamOption[]
}

export function DraftsTable({
  organizationId,
  projects,
  teams,
}: DraftsTableProps) {
  const { drafts, ready, removeDraft, refresh } = useIssueDrafts(organizationId)
  const [query, setQuery] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
  ])
  const [continueDraft, setContinueDraft] = React.useState<IssueDraft | null>(
    null
  )
  const [deleteDraft, setDeleteDraft] = React.useState<IssueDraft | null>(null)

  const teamNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const team of teams) {
      map.set(
        team.id,
        team.identifier ? `${team.name} (${team.identifier})` : team.name
      )
    }
    return map
  }, [teams])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return drafts
    return drafts.filter((draft) => {
      const title = draftDisplayTitle(draft).toLowerCase()
      const summary = draft.description.toLowerCase()
      return title.includes(q) || summary.includes(q)
    })
  }, [drafts, query])

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => draftDisplayTitle(row), {
          id: "title",
          header: "Title",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium">
                {draftDisplayTitle(row.original)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {draftSummaryPreview(row.original)}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor("teamId", {
          header: "Team",
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">
              {teamNameById.get(getValue()) ?? "Unknown team"}
            </span>
          ),
        }),
        columnHelper.accessor("priority", {
          header: "Priority",
          cell: ({ getValue }) => priorityLabels[getValue()],
        }),
        columnHelper.accessor("updatedAt", {
          header: "Updated",
          cell: ({ getValue }) => (
            <span className="text-muted-foreground tabular-nums">
              {formatUpdatedAt(getValue())}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <div
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="flex size-8 text-muted-foreground data-open:bg-muted"
                      size="icon"
                    />
                  }
                >
                  <IconDotsVertical />
                  <span className="sr-only">Open menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setContinueDraft(row.original)}
                    >
                      <IconPencil data-icon="inline-start" />
                      Continue
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteDraft(row.original)}
                    >
                      <IconTrash data-icon="inline-start" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [teamNameById]
  )

  const table = useTable({
    features,
    columns,
    data: ready ? filtered : EMPTY_DRAFTS,
    getRowId: (row) => row.id,
    state: { sorting },
    onSortingChange: setSorting,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Drafts</h1>
          <p className="text-sm text-muted-foreground">
            On-device issue drafts saved from the create form. Not synced to the
            server.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drafts…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {!ready ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Loading drafts…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {query.trim()
                      ? "No drafts match your search."
                      : "No drafts yet. Save one from New issue."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setContinueDraft(row.original)}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={continueDraft !== null}
        onOpenChange={(open) => {
          if (!open) setContinueDraft(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue draft</DialogTitle>
            <DialogDescription>
              Resume this draft, then create the issue or save again.
            </DialogDescription>
          </DialogHeader>
          {continueDraft ? (
            <CreateIssueForm
              key={continueDraft.id}
              projects={projects}
              teams={teams}
              organizationId={organizationId}
              draftId={continueDraft.id}
              initialValues={{
                title: continueDraft.title,
                teamId: continueDraft.teamId,
                projectId: continueDraft.projectId,
                priority: continueDraft.priority,
                description: continueDraft.description,
              }}
              onCreated={() => {
                setContinueDraft(null)
                refresh()
              }}
              onDraftSaved={() => {
                refresh()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDraft !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDraft(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDraft
                ? `“${draftDisplayTitle(deleteDraft)}” will be removed from this browser.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteDraft) return
                removeDraft(deleteDraft.id)
                setDeleteDraft(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
