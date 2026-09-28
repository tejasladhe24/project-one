import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconPlus,
  IconSearch,
  IconUsersGroup,
} from "@tabler/icons-react"
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { CreateTeamForm } from "@/components/teams/create-team-form"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { leaveTeam, requestTeamJoin } from "@/lib/teams"

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  memberCount: z.number(),
  createdAt: z.string(),
  isMember: z.boolean(),
})

export type TeamRow = z.infer<typeof teamSchema>

const columnHelper = createColumnHelper<typeof features, TeamRow>()

type MemberTeamActionsProps = {
  team: TeamRow
  onLeave: (team: TeamRow) => void
}

function MemberTeamActions({ team, onLeave }: MemberTeamActionsProps) {
  const navigate = useNavigate()

  return (
    <div
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
              onClick={() => {
                void navigate({
                  to: "/team/$teamId",
                  params: { teamId: team.id },
                })
              }}
            >
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void navigate({
                  to: "/team/$teamId/settings",
                  params: { teamId: team.id },
                })
              }}
            >
              Team settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onLeave(team)}>
            Leave
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type JoinRequestButtonProps = {
  team: TeamRow
  onRequested?: () => void
}

function JoinRequestButton({ team, onRequested }: JoinRequestButtonProps) {
  const { mutate, pending } = useServerMutation()

  async function handleRequest() {
    try {
      await mutate(() => requestTeamJoin({ data: { teamId: team.id } }), {
        successMessage: "Join request sent to owners and admins",
        errorMessage: "Could not send join request",
      })
      onRequested?.()
    } catch {
      // toast handled by useServerMutation
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void handleRequest()}
      >
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? "Sending…" : "Request to join"}
      </Button>
    </div>
  )
}

type TeamsTableProps = {
  data: TeamRow[]
  onCreated?: () => void
}

export function TeamsTable({ data, onCreated }: TeamsTableProps) {
  const navigate = useNavigate()
  const { mutate: leaveMutate, pending: leavePending } = useServerMutation()
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [createOpen, setCreateOpen] = React.useState(false)
  const [leaveTeamRow, setLeaveTeamRow] = React.useState<TeamRow | null>(null)
  const [leaveError, setLeaveError] = React.useState<string | null>(null)

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "select",
          header: ({ table }) => (
            <div className="flex items-center justify-center">
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() ? true : false)
                }
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
              />
            </div>
          ),
          cell: ({ row }) => (
            <div
              className="flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        }),
        columnHelper.accessor("name", {
          header: "Name",
          cell: ({ getValue, row }) => (
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                <IconUsersGroup className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{getValue()}</span>
                {!row.original.isMember ? (
                  <span className="text-xs text-muted-foreground">
                    Not a member
                  </span>
                ) : null}
              </div>
            </div>
          ),
          enableHiding: false,
        }),
        columnHelper.accessor("memberCount", {
          header: "Members",
          cell: ({ getValue }) => (
            <Badge variant="outline" className="text-muted-foreground">
              {getValue()}
            </Badge>
          ),
        }),
        columnHelper.accessor("createdAt", {
          header: "Created",
          cell: ({ getValue }) => {
            const value = getValue()
            const date = new Date(value)
            return Number.isNaN(date.getTime())
              ? value
              : date.toLocaleDateString()
          },
        }),
        columnHelper.display({
          id: "actions",
          cell: ({ row }) =>
            row.original.isMember ? (
              <MemberTeamActions
                team={row.original}
                onLeave={(team) => {
                  setLeaveTeamRow(team)
                  setLeaveError(null)
                }}
              />
            ) : (
              <JoinRequestButton team={row.original} onRequested={onCreated} />
            ),
        }),
      ]),
    [onCreated]
  )

  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  const nameFilter =
    (table.getColumn("name")?.getFilterValue() as string | undefined) ?? ""

  async function handleLeave() {
    if (!leaveTeamRow) return
    const name = leaveTeamRow.name
    setLeaveError(null)
    try {
      await leaveMutate(
        () => leaveTeam({ data: { teamId: leaveTeamRow.id } }),
        {
          successMessage: `Left ${name}`,
          errorMessage: "Could not leave team",
        }
      )
      setLeaveTeamRow(null)
      onCreated?.()
    } catch (error) {
      setLeaveError(
        error instanceof Error ? error.message : "Could not leave team"
      )
    }
  }

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div className="relative w-full max-w-sm">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter teams…"
            value={nameFilter}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <IconLayoutColumns data-icon="inline-start" />
              <span className="hidden lg:inline">Customize Columns</span>
              <span className="lg:hidden">Columns</span>
              <IconChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" &&
                      column.getCanHide()
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <IconPlus data-icon="inline-start" />
              <span className="hidden lg:inline">Create team</span>
              <span className="lg:hidden">Create</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create team</DialogTitle>
                <DialogDescription>
                  Add a team to the active organization.
                </DialogDescription>
              </DialogHeader>
              <CreateTeamForm
                onCreated={() => {
                  setCreateOpen(false)
                  onCreated?.()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
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
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={
                      row.original.isMember ? "cursor-pointer" : undefined
                    }
                    onClick={() => {
                      if (!row.original.isMember) return
                      void navigate({
                        to: "/team/$teamId",
                        params: { teamId: row.original.id },
                      })
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No teams yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label
                htmlFor="teams-rows-per-page"
                className="text-sm font-medium"
              >
                Rows per page
              </Label>
              <Select
                value={`${table.state.pagination.pageSize}`}
                onValueChange={(value) => {
                  if (value === null) return
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-20"
                  id="teams-rows-per-page"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.state.pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={leaveTeamRow !== null}
        onOpenChange={(open) => {
          if (!open && !leavePending) setLeaveTeamRow(null)
        }}
      >
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave team?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveTeamRow
                ? `You will leave “${leaveTeamRow.name}”. You can request to join again later.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {leaveError ? (
            <Alert variant="destructive">
              <AlertDescription>{leaveError}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leavePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={leavePending}
              onClick={(e) => {
                e.preventDefault()
                void handleLeave()
              }}
            >
              {leavePending ? <Spinner data-icon="inline-start" /> : null}
              {leavePending ? "Leaving…" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
