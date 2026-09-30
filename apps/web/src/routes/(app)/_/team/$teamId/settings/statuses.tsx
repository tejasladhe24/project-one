import * as React from "react"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconPencil, IconPlus } from "@tabler/icons-react"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { StatusIcon } from "@/components/issue/status-icon"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  createStatus,
  isFixedStatusCategory,
  listStatuses,
  STATUS_CATEGORIES,
  STATUS_CATEGORY_LABELS,
  STATUS_CATEGORY_ORDER,
  updateStatus,
  type StatusCategory,
} from "@/lib/statuses"
import { pageMeta } from "@/lib/seo"

const CREATABLE_CATEGORIES = STATUS_CATEGORIES.filter(
  (c) => !isFixedStatusCategory(c)
) as Exclude<StatusCategory, "triage" | "duplicate">[]

const createStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
  category: z.enum(
    CREATABLE_CATEGORIES as [
      (typeof CREATABLE_CATEGORIES)[number],
      ...(typeof CREATABLE_CATEGORIES)[number][],
    ]
  ),
  description: z.string().max(500),
})

const editStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
  category: z.enum(STATUS_CATEGORIES),
  description: z.string().max(500),
})

type StatusRow = Awaited<ReturnType<typeof listStatuses>>[number]

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/statuses")(
  {
    loader: async ({ params, context }) => {
      const team = context.team
      const [statuses] = await Promise.all([
        listStatuses({ data: { teamId: params.teamId } }),
      ])
      return { team, statuses }
    },
    head: ({ loaderData }) =>
      pageMeta({
        title: loaderData?.team?.name
          ? `Statuses · ${loaderData.team.name}`
          : "Statuses",
        noIndex: true,
      }),
    component: TeamStatusesPage,
  }
)

function CreateStatusForm({
  teamId,
  defaultCategory,
  onCreated,
}: {
  teamId: string
  defaultCategory?: StatusCategory
  onCreated?: () => void
}) {
  const [formError, setFormError] = React.useState<string | null>(null)
  const categoryItems = CREATABLE_CATEGORIES.map((value) => ({
    value,
    label: STATUS_CATEGORY_LABELS[value],
  }))

  const form = useForm({
    defaultValues: {
      name: "",
      category: (defaultCategory && !isFixedStatusCategory(defaultCategory)
        ? defaultCategory
        : "unstarted") as (typeof CREATABLE_CATEGORIES)[number],
      description: "",
    },
    validators: { onSubmit: createStatusSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        await createStatus({
          data: {
            teamId,
            name: value.name.trim(),
            category: value.category,
            description: value.description.trim() || undefined,
          },
        })
        form.reset()
        onCreated?.()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create status"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="create-status-form"
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
                    placeholder="e.g. In Progress"
                    autoFocus
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="category">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                <Select
                  items={categoryItems}
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value === null) return
                    field.handleChange(
                      value as (typeof CREATABLE_CATEGORIES)[number]
                    )
                  }}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </form>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            form="create-status-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Creating…" : "Create status"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}

function EditStatusForm({
  teamId,
  status,
  onUpdated,
}: {
  teamId: string
  status: StatusRow
  onUpdated?: () => void
}) {
  const [formError, setFormError] = React.useState<string | null>(null)
  const fixed = isFixedStatusCategory(status.category)
  const categoryItems = (fixed ? STATUS_CATEGORIES : CREATABLE_CATEGORIES).map(
    (value) => ({
      value,
      label: STATUS_CATEGORY_LABELS[value],
    })
  )

  const form = useForm({
    defaultValues: {
      name: status.name,
      category: status.category as StatusCategory,
      description: status.description ?? "",
    },
    validators: { onSubmit: editStatusSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        await updateStatus({
          data: {
            id: status.id,
            teamId,
            name: value.name.trim(),
            description: value.description.trim() || null,
            category: fixed ? undefined : value.category,
          },
        })
        onUpdated?.()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not update status"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="edit-status-form"
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
                  <FieldLabel htmlFor={`edit-${field.name}`}>Name</FieldLabel>
                  <Input
                    id={`edit-${field.name}`}
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

          <form.Field name="category">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`edit-${field.name}`}>Category</FieldLabel>
                <Select
                  items={categoryItems}
                  value={field.state.value}
                  disabled={fixed}
                  onValueChange={(value) => {
                    if (value === null || fixed) return
                    field.handleChange(value as StatusCategory)
                  }}
                >
                  <SelectTrigger id={`edit-${field.name}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {fixed ? (
                  <p className="text-xs text-muted-foreground">
                    This category is fixed and cannot be changed.
                  </p>
                ) : null}
              </Field>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`edit-${field.name}`}>
                  Description
                </FieldLabel>
                <Textarea
                  id={`edit-${field.name}`}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </form>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            form="edit-status-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}

function TeamStatusesPage() {
  const { team, statuses } = Route.useLoaderData()
  const { teamId } = Route.useParams()
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createCategory, setCreateCategory] = React.useState<
    StatusCategory | undefined
  >(undefined)
  const [editingStatus, setEditingStatus] = React.useState<StatusRow | null>(
    null
  )

  const grouped = React.useMemo(() => {
    return STATUS_CATEGORY_ORDER.map((category) => {
      const categoryStatuses = statuses.filter((s) => s.category === category)
      const maxSortOrder = categoryStatuses.reduce(
        (max, s) => Math.max(max, s.sortOrder),
        0
      )
      return {
        category,
        label: STATUS_CATEGORY_LABELS[category],
        statuses: categoryStatuses,
        maxSortOrder,
      }
    })
  }, [statuses])

  function openCreate(category?: StatusCategory) {
    setCreateCategory(category)
    setCreateOpen(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/team/$teamId/settings"
            params={{ teamId }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {team.name}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Issue statuses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue statuses define the workflow that issues go through from start
            to completion.
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) setCreateCategory(undefined)
          }}
        >
          <Button size="sm" variant="outline" onClick={() => openCreate()}>
            <IconPlus data-icon="inline-start" />
            Add
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New status</DialogTitle>
              <DialogDescription>
                Choose a category. Sort order is assigned within that category.
              </DialogDescription>
            </DialogHeader>
            <CreateStatusForm
              key={createCategory ?? "any"}
              teamId={teamId}
              defaultCategory={createCategory}
              onCreated={() => {
                setCreateOpen(false)
                setCreateCategory(undefined)
                void router.invalidate()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setEditingStatus(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit status</DialogTitle>
            <DialogDescription>
              Update the name, category, or description for this status.
            </DialogDescription>
          </DialogHeader>
          {editingStatus ? (
            <EditStatusForm
              key={editingStatus.id}
              teamId={teamId}
              status={editingStatus}
              onUpdated={() => {
                setEditingStatus(null)
                void router.invalidate()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-6">
        {grouped.map((group) => (
          <section key={group.category} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                {group.label}
              </h2>
              {!isFixedStatusCategory(group.category) ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openCreate(group.category)}
                  aria-label={`Add status to ${group.label}`}
                >
                  <IconPlus className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-lg border">
              {group.statuses.length === 0 &&
              !isFixedStatusCategory(group.category) ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No statuses in this category.
                </div>
              ) : (
                <ul className="divide-y">
                  {group.statuses.map((status) => (
                    <li
                      key={status.id}
                      className="group flex items-center gap-3 px-4 py-3"
                    >
                      <StatusIcon
                        category={status.category as StatusCategory}
                        name={status.name}
                        sortOrder={status.sortOrder}
                        maxSortOrder={group.maxSortOrder}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {status.name}
                          </span>
                          {status.isDefault ? (
                            <span className="text-xs text-muted-foreground">
                              · Default
                            </span>
                          ) : null}
                        </div>
                        {status.description ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {status.description}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => setEditingStatus(status)}
                        aria-label={`Edit ${status.name}`}
                      >
                        <IconPencil className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
