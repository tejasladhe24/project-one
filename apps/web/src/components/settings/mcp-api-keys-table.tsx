import * as React from "react"
import {
  IconCopy,
  IconDotsVertical,
  IconKey,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
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
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  createMcpApiKey,
  revokeMcpApiKey,
  updateMcpApiKey,
  type McpApiKeyRow,
} from "@/lib/mcp/keys"
import { toast } from "sonner"

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
})

type McpApiKeysTableProps = {
  data: McpApiKeyRow[]
  onChanged?: () => void
}

function CreateKeyForm({
  onCreated,
}: {
  onCreated: (created: { name: string | null; key: string }) => void
}) {
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: "cursor-mcp" },
    validators: { onSubmit: nameSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        const created = await createMcpApiKey({
          data: { name: value.name.trim() },
        })
        form.reset()
        onCreated({ name: created.name, key: created.key })
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create API key"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="create-mcp-key-form"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="e.g. cursor-mcp"
                    autoFocus
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>
        </FieldGroup>
      </form>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            form="create-mcp-key-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Creating…" : "Create key"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}

function RenameKeyForm({
  keyRow,
  onRenamed,
}: {
  keyRow: McpApiKeyRow
  onRenamed: () => void
}) {
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: keyRow.name ?? "" },
    validators: { onSubmit: nameSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        await updateMcpApiKey({
          data: { keyId: keyRow.id, name: value.name.trim() },
        })
        onRenamed()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not rename API key"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="rename-mcp-key-form"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    autoFocus
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>
        </FieldGroup>
      </form>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            form="rename-mcp-key-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}

function KeyActions({
  keyRow,
  onRename,
  onDelete,
}: {
  keyRow: McpApiKeyRow
  onRename: (row: McpApiKeyRow) => void
  onDelete: (row: McpApiKeyRow) => void
}) {
  return (
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
          <DropdownMenuItem onClick={() => onRename(keyRow)}>
            Rename
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(keyRow)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function McpApiKeysTable({ data, onChanged }: McpApiKeysTableProps) {
  const { mutate, pending } = useServerMutation()
  const [query, setQuery] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createdSecret, setCreatedSecret] = React.useState<{
    name: string | null
    key: string
  } | null>(null)
  const [renameRow, setRenameRow] = React.useState<McpApiKeyRow | null>(null)
  const [deleteRow, setDeleteRow] = React.useState<McpApiKeyRow | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) => {
      const name = (row.name ?? "").toLowerCase()
      const start = (row.start ?? "").toLowerCase()
      return name.includes(q) || start.includes(q)
    })
  }, [data, query])

  async function handleDelete() {
    if (!deleteRow) return
    setDeleteError(null)
    try {
      await mutate(() => revokeMcpApiKey({ data: { keyId: deleteRow.id } }), {
        successMessage: "API key deleted",
        invalidate: false,
      })
      setDeleteRow(null)
      onChanged?.()
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete API key"
      )
    }
  }

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) setCreatedSecret(null)
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <IconPlus data-icon="inline-start" />
            Create key
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {createdSecret ? "API key created" : "Create API key"}
              </DialogTitle>
              <DialogDescription>
                {createdSecret
                  ? "Copy this key now. You won’t be able to see it again."
                  : "Create an API key scoped to the active organization."}
              </DialogDescription>
            </DialogHeader>
            {createdSecret ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-sm break-all">
                  {createdSecret.key}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void copyKey(createdSecret.key)}
                  >
                    <IconCopy data-icon="inline-start" />
                    Copy key
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateOpen(false)
                      setCreatedSecret(null)
                      onChanged?.()
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <CreateKeyForm
                onCreated={(created) => {
                  setCreatedSecret(created)
                  onChanged?.()
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <IconKey className="size-5 opacity-50" />
                    <span>No API keys yet.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.name || "Untitled"}
                  </TableCell>
                  <TableCell>
                    <code className="text-sm text-muted-foreground">
                      {row.start ? `${row.start}…` : "—"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground capitalize"
                    >
                      {row.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.expiresAt
                      ? new Date(row.expiresAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <KeyActions
                      keyRow={row}
                      onRename={setRenameRow}
                      onDelete={setDeleteRow}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={renameRow !== null}
        onOpenChange={(open) => {
          if (!open) setRenameRow(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename API key</DialogTitle>
            <DialogDescription>
              Update the display name for this key. The secret itself does not
              change.
            </DialogDescription>
          </DialogHeader>
          {renameRow ? (
            <RenameKeyForm
              key={renameRow.id}
              keyRow={renameRow}
              onRenamed={() => {
                setRenameRow(null)
                toast.success("API key renamed")
                onChanged?.()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteRow !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setDeleteRow(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `“${deleteRow.name || "Untitled"}” will stop working immediately. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
