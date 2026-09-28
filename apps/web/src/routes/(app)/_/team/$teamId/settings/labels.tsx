import * as React from "react"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconPlus, IconSearch } from "@tabler/icons-react"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
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
import { createLabel, listLabels } from "@/lib/labels"

const DOT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
]

const createLabelSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
})

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % DOT_COLORS.length
  }
  return DOT_COLORS[hash]!
}

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/labels")({
  loader: async ({ context }) => {
    const team = context.team
    const labels = await listLabels()
    return { team, labels }
  },
  component: TeamLabelsPage,
})

function CreateLabelForm({ onCreated }: { onCreated?: () => void }) {
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: createLabelSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        await createLabel({ data: { name: value.name.trim() } })
        form.reset()
        onCreated?.()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create label"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="create-label-form"
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
                    placeholder="e.g. bug"
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
            form="create-label-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Creating…" : "Create label"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}

function TeamLabelsPage() {
  const { team, labels } = Route.useLoaderData()
  const { teamId } = Route.useParams()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return labels
    return labels.filter((label) => label.name.toLowerCase().includes(q))
  }, [labels, query])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <Link
          to="/team/$teamId/settings"
          params={{ teamId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {team.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Team issue labels
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              New group
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <IconPlus data-icon="inline-start" />
                New label
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>New label</DialogTitle>
                  <DialogDescription>
                    Create a label that can be applied to issues.
                  </DialogDescription>
                </DialogHeader>
                <CreateLabelForm
                  onCreated={() => {
                    setCreateOpen(false)
                    void router.invalidate()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  No labels yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((label) => (
                <TableRow key={label.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: colorFor(label.name) }}
                      />
                      <span className="font-medium">{label.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(label.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
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
