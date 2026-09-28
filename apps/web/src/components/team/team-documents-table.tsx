import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconFileText, IconPlus, IconSearch } from "@tabler/icons-react"
import { z } from "zod"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@workspace/ui/components/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { createTeamDocument } from "@/lib/documents"
import { MarkdownEditor } from "@/components/markdown-editor"

export type TeamDocumentRow = {
  id: string
  title: string
  projectId: string | null
  projectName: string | null
  issueId: string | null
  issueNumber: number | null
  issueTitle: string | null
  ownerId: string | null
  ownerName: string | null
  ownerImage: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type ProjectOption = { id: string; name: string }
export type IssueOption = {
  id: string
  number: number
  title: string
  identifier: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

export function formatRelativeTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value
  const diffMs = Date.now() - date.getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().max(200_000),
  projectId: z.string(),
  issueId: z.string(),
})

const PREVIEW_LIMIT = 4

type LinkOption = { value: string; label: string }

function LinkOptionCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
}: {
  options: LinkOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  emptyLabel: string
}) {
  const [query, setQuery] = React.useState("")

  const selected =
    options.find((option) => option.value === value) ?? options[0] ?? null

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? options.filter((option) => option.label.toLowerCase().includes(q))
      : options
    return matched.slice(0, PREVIEW_LIMIT)
  }, [options, query])

  return (
    <Combobox
      items={options}
      filteredItems={filteredItems}
      value={selected}
      onValueChange={(next) => {
        onValueChange(next?.value ?? "none")
      }}
      onInputValueChange={(inputValue, { reason }) => {
        if (reason === "input-change") setQuery(inputValue)
        else setQuery("")
      }}
      onOpenChange={(open) => {
        if (!open) setQuery("")
      }}
      itemToStringValue={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxTrigger
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none transition-colors select-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30 dark:hover:bg-input/50"
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selected?.label ?? "Select…"}
        </span>
      </ComboboxTrigger>
      <ComboboxContent
        align="start"
        className="w-(--anchor-width) min-w-(--anchor-width)"
      >
        <ComboboxInput
          placeholder={placeholder}
          showTrigger={false}
          className="w-full"
        />
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              <span className="truncate">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

type TeamDocumentsTableProps = {
  teamId: string
  documents: TeamDocumentRow[]
  projects: ProjectOption[]
  issues: IssueOption[]
}

export function TeamDocumentsTable({
  teamId,
  documents,
  projects,
  issues,
}: TeamDocumentsTableProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return documents
    return documents.filter((doc) => {
      const haystack = [
        doc.title,
        doc.projectName,
        doc.issueTitle,
        doc.issueNumber != null ? String(doc.issueNumber) : null,
        doc.ownerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [documents, query])

  const projectOptions = React.useMemo<LinkOption[]>(
    () => [
      { value: "none", label: "No project" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  )
  const issueOptions = React.useMemo<LinkOption[]>(
    () => [
      { value: "none", label: "No issue" },
      ...issues.map((i) => ({
        value: i.id,
        label: `${i.identifier}-${String(i.number).padStart(3, "0")} ${i.title}`,
      })),
    ],
    [issues]
  )

  const form = useForm({
    defaultValues: {
      title: "",
      content: "",
      projectId: "none",
      issueId: "none",
    },
    validators: { onSubmit: createSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        const created = await createTeamDocument({
          data: {
            teamId,
            title: value.title.trim(),
            content: value.content.trim() || undefined,
            projectId:
              value.projectId === "none" ? null : value.projectId || null,
            issueId: value.issueId === "none" ? null : value.issueId || null,
          },
        })
        setOpen(false)
        form.reset()
        void router.navigate({
          to: "/team/$teamId/documents/$documentId",
          params: { teamId, documentId: created.id },
        })
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create document"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) {
              setFormError(null)
              form.reset()
            }
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <IconPlus data-icon="inline-start" />
            New document
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New document</DialogTitle>
              <DialogDescription>
                Documents belong to this team. Optionally link a project or
                issue.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                void form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field name="title">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g. Product requirements"
                          autoFocus
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="content">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Content</FieldLabel>
                      <MarkdownEditor
                        variant="compact"
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder="Write your document…"
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="projectId">
                  {(field) => (
                    <Field>
                      <FieldLabel>Project</FieldLabel>
                      <LinkOptionCombobox
                        options={projectOptions}
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        placeholder="Search projects…"
                        emptyLabel="No projects found."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="issueId">
                  {(field) => (
                    <Field>
                      <FieldLabel>Issue</FieldLabel>
                      <LinkOptionCombobox
                        options={issueOptions}
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        placeholder="Search issues…"
                        emptyLabel="No issues found."
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    Create document
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-28">Created</TableHead>
              <TableHead className="w-28">Last edited</TableHead>
              <TableHead className="w-40">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {documents.length === 0
                    ? "No documents yet. Create one to get started."
                    : "No documents match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow key={doc.id} className="group">
                  <TableCell>
                    <Link
                      to="/team/$teamId/documents/$documentId"
                      params={{ teamId, documentId: doc.id }}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <IconFileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{doc.title}</span>
                    </Link>
                    {doc.projectName || doc.issueNumber != null ? (
                      <div className="mt-0.5 ml-6 truncate text-xs text-muted-foreground">
                        {[
                          doc.projectName,
                          doc.issueNumber != null && doc.issueTitle
                            ? `#${doc.issueNumber} ${doc.issueTitle}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(doc.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(doc.updatedAt)}
                  </TableCell>
                  <TableCell>
                    {doc.ownerName ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          {doc.ownerImage ? (
                            <AvatarImage
                              src={doc.ownerImage}
                              alt={doc.ownerName}
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {getInitials(doc.ownerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{doc.ownerName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
