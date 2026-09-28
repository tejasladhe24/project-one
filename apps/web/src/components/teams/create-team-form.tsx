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
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth/client"

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name is required"),
  identifier: z
    .string()
    .min(1, "Identifier is required")
    .max(4, "Max 4 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
})

type CreateTeamFormProps = {
  onCreated?: () => void
}

export function CreateTeamForm({ onCreated }: CreateTeamFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name: "",
      identifier: "",
    },
    validators: {
      onSubmit: createTeamSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      const { error } = await authClient.organization.createTeam({
        name: value.name.trim(),
        identifier: value.identifier.trim().toUpperCase(),
      })

      if (error) {
        setFormError(error.message ?? "Could not create team")
        return
      }

      form.reset()
      onCreated?.()
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <form
        id="create-team-form"
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
                    placeholder="Engineering"
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="identifier">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Identifier</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(e.target.value.toUpperCase())
                    }
                    aria-invalid={isInvalid}
                    placeholder="ENG"
                    maxLength={4}
                    className="uppercase"
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
            form="create-team-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Creating…" : "Create team"}
          </Button>
        )}
      </form.Subscribe>
    </div>
  )
}
