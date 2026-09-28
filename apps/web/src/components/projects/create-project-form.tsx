import { useState } from "react"
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
import { ISSUE_PRIORITIES } from "@/lib/issues/meta"
import { createProject } from "@/lib/projects"

const priorityItems = ISSUE_PRIORITIES.map((p) => ({
  label: p.label,
  value: String(p.value) as "0" | "1" | "2" | "3" | "4",
}))

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  priority: z.enum(["0", "1", "2", "3", "4"]),
  targetDate: z.string().min(1, "Target date is required"),
})

type CreateProjectFormProps = {
  onCreated?: () => void
  /** When set, the new project is linked to this team. */
  teamId?: string
}

export function CreateProjectForm({
  onCreated,
  teamId,
}: CreateProjectFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name: "",
      priority: "0" as "0" | "1" | "2" | "3" | "4",
      targetDate: "",
    },
    validators: {
      onSubmit: createProjectSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        await createProject({
          data: {
            name: value.name.trim(),
            priority: Number(value.priority),
            targetDate: value.targetDate,
            ...(teamId ? { teamId } : {}),
          },
        })
        form.reset()
        onCreated?.()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create project"
        )
      }
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="create-project-form"
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
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Website redesign"
                  />
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
                      field.handleChange(value as "0" | "1" | "2" | "3" | "4")
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      className="w-full"
                      aria-invalid={isInvalid}
                    >
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

          <form.Field name="targetDate">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Target date</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
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
            form="create-project-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Creating…" : "Create project"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}
