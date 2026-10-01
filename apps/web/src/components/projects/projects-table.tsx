import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconFileChart,
  IconPlus,
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
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table"
import { z } from "zod"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { priorityLabel } from "@/lib/shared/priority"
import { getInitials } from "@/lib/shared/string"
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
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { CreateProjectForm } from "@/components/projects/create-project-form"
import { OrgTableToolbar } from "@/components/shared/org-data-table"

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

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  priority: z.number(),
  leadName: z.string().nullable(),
  leadImage: z.string().nullable().optional(),
  targetDate: z.string(),
  issuesCount: z.number(),
  progress: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProjectRow = z.infer<typeof projectSchema>

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatRelativeDue(targetDate: string) {
  const target = new Date(targetDate)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  if (diffDays === -1) return "1 day overdue"
  if (diffDays > 1) return `${diffDays} days left`
  return `${Math.abs(diffDays)} days overdue`
}

function ProjectProgressCell({ project }: { project: ProjectRow }) {
  const value = Math.min(100, Math.max(0, project.progress))
  const dueLabel = formatRelativeDue(project.targetDate)

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        closeDelay={100}
        render={
          <button
            type="button"
            className="-mx-2 -my-2 flex min-h-12 w-[calc(100%+1rem)] min-w-32 cursor-default items-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <Progress value={value} className="w-full" />
        <span className="sr-only">{value}% complete</span>
      </HoverCardTrigger>
      <HoverCardContent align="end" side="bottom" className="w-56 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium tabular-nums">{value}%</span>
          </div>
          {dueLabel ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Schedule</span>
              <span className="font-medium">{dueLabel}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Created</span>
            <span className="tabular-nums">
              {formatDate(project.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Updated</span>
            <span className="tabular-nums">
              {formatDate(project.updatedAt)}
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

const columnHelper = createColumnHelper<typeof features, ProjectRow>()

const columns = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? true : false)
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
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
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-muted">
          <IconFileChart className="size-4 text-muted-foreground" />
        </div>
        <Link
          to="/project/$id"
          params={{ id: row.original.id }}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      </div>
    ),
    enableHiding: false,
  }),
  columnHelper.accessor("priority", {
    header: "Priority",
    cell: ({ getValue }) => {
      const priority = getValue()
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {priorityLabel(priority)}
        </Badge>
      )
    },
  }),
  columnHelper.accessor("leadName", {
    header: "Lead",
    cell: ({ row }) => {
      const name = row.original.leadName
      if (!name) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            {row.original.leadImage ? (
              <AvatarImage src={row.original.leadImage} alt={name} />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{name}</span>
        </div>
      )
    },
  }),
  columnHelper.accessor("targetDate", {
    header: "Target date",
    cell: ({ getValue }) => {
      const value = getValue()
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
    },
  }),
  columnHelper.accessor("issuesCount", {
    header: "Issues",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground tabular-nums">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("progress", {
    header: "Progress",
    cell: ({ row }) => <ProjectProgressCell project={row.original} />,
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => (
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
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem
              render={
                <Link to="/project/$id" params={{ id: row.original.id }} />
              }
            >
              Open
            </DropdownMenuItem>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
])

type ProjectsTableProps = {
  data: ProjectRow[]
  onCreated?: () => void
  /** When set, created projects are linked to this team. */
  teamId?: string
}

export function ProjectsTable({ data, onCreated, teamId }: ProjectsTableProps) {
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

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <OrgTableToolbar
        searchPlaceholder="Filter projects…"
        searchValue={nameFilter}
        onSearchChange={(value) =>
          table.getColumn("name")?.setFilterValue(value)
        }
        columns={table.getAllColumns()}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <IconPlus data-icon="inline-start" />
              <span className="hidden lg:inline">Create project</span>
              <span className="lg:hidden">Create</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  {teamId
                    ? "Add a project and link it to this team."
                    : "Add a project to the active organization."}
                </DialogDescription>
              </DialogHeader>
              <CreateProjectForm
                teamId={teamId}
                onCreated={() => {
                  setCreateOpen(false)
                  onCreated?.()
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

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
                    No projects yet.
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
                htmlFor="projects-rows-per-page"
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
                  id="projects-rows-per-page"
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
    </div>
  )
}
