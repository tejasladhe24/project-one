import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
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
import { createIssue } from "@/lib/issues"
import {
  deleteIssueDraft,
  saveIssueDraft,
  type IssueDraftPriority,
  type IssueDraftValues,
} from "@/lib/issues/drafts"
import { toast } from "sonner"

const priorityItems = [
  { label: "No priority", value: "0" },
  { label: "Urgent", value: "1" },
  { label: "High", value: "2" },
  { label: "Medium", value: "3" },
  { label: "Low", value: "4" },
] as const

const createIssueSchema = z.object({
  title: z.string().min(2, "Title is required"),
  teamId: z.string().min(1, "Team is required"),
  projectId: z.string(),
  priority: z.enum(["0", "1", "2", "3", "4"]),
  description: z.string(),
})

export type CreateIssueProjectOption = {
  id: string
  name: string
}

export type CreateIssueTeamOption = {
  id: string
  name: string
  identifier: string | null
}

export type CreateIssueFormValues = IssueDraftValues

type CreateIssueFormProps = {
  projects: CreateIssueProjectOption[]
  teams: CreateIssueTeamOption[]
  teamId?: string
  organizationId: string
  draftId?: string
  initialValues?: Partial<CreateIssueFormValues>
  onCreated?: () => void
  onDraftSaved?: (draftId: string) => void
}

export function CreateIssueForm({
  projects,
  teams,
  teamId,
  organizationId,
  draftId: draftIdProp,
  initialValues,
  onCreated,
  onDraftSaved,
}: CreateIssueFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null)
  const [draftId, setDraftId] = React.useState<string | undefined>(draftIdProp)
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)

  React.useEffect(() => {
    setDraftId(draftIdProp)
  }, [draftIdProp])

  const projectItems = [
    { label: "No project", value: "__none__" },
    ...projects.map((p) => ({
      label: p.name,
      value: p.id,
    })),
  ]
  const teamItems = teams.map((t) => ({
    label: t.identifier ? `${t.name} (${t.identifier})` : t.name,
    value: t.id,
  }))

  const form = useForm({
    defaultValues: {
      title: initialValues?.title ?? "",
      teamId: initialValues?.teamId ?? teamId ?? teams[0]?.id ?? "",
      projectId: initialValues?.projectId ?? "__none__",
      priority: (initialValues?.priority ?? "0") as IssueDraftPriority,
      description: initialValues?.description ?? "",
    },
    validators: {
      onSubmit: createIssueSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        await createIssue({
          data: {
            title: value.title.trim(),
            teamId: value.teamId,
            projectId:
              value.projectId && value.projectId !== "__none__"
                ? value.projectId
                : undefined,
            priority: Number(value.priority),
            description: value.description.trim() || undefined,
          },
        })
        if (draftId) {
          deleteIssueDraft(organizationId, draftId)
          setDraftId(undefined)
        }
        form.reset()
        onCreated?.()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create issue"
        )
      }
    },
  })

  async function handleSaveDraft() {
    setFormError(null)
    setIsSavingDraft(true)
    try {
      const values = form.state.values
      const saved = saveIssueDraft({
        organizationId,
        draftId,
        values: {
          title: values.title,
          teamId: values.teamId,
          projectId: values.projectId,
          priority: values.priority,
          description: values.description,
        },
      })
      setDraftId(saved.id)
      onDraftSaved?.(saved.id)
      toast.success("Draft saved")
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save draft"
      )
    } finally {
      setIsSavingDraft(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        id="create-issue-form"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
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
                    aria-invalid={isInvalid}
                    placeholder="Issue title"
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>

          {!teamId ? (
            <form.Field name="teamId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Team</FieldLabel>
                    <Select
                      items={teamItems}
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (value === null) return
                        field.handleChange(value)
                      }}
                    >
                      <SelectTrigger id={field.name} className="w-full">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {teamItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )
              }}
            </form.Field>
          ) : null}

          <form.Field name="projectId">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Project</FieldLabel>
                  <Select
                    items={projectItems}
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === null) return
                      field.handleChange(value)
                    }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Optional project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projectItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="priority">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Priority</FieldLabel>
                  <Select
                    items={[...priorityItems]}
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === null) return
                      field.handleChange(value as typeof field.state.value)
                    }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {priorityItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
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
                  rows={3}
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isSavingDraft}
              className="w-full sm:flex-1"
              onClick={() => {
                void handleSaveDraft()
              }}
            >
              {isSavingDraft ? <Spinner data-icon="inline-start" /> : null}
              Save draft
            </Button>
            <Button
              type="submit"
              form="create-issue-form"
              disabled={isSubmitting || isSavingDraft}
              className="w-full sm:flex-1"
            >
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              Create issue
            </Button>
          </div>
        )}
      </form.Subscribe>
    </div>
  )
}
