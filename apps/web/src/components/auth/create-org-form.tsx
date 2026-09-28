import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth/client"

const createOrgSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens"
    ),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CreateOrgForm() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onSubmit: createOrgSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const { data, error } = await authClient.organization.create({
        name: value.name.trim(),
        slug: value.slug.trim(),
      })
      if (error) {
        setFormError(error.message ?? "Could not create organization")
        return
      }

      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id })
      }

      await navigate({ to: "/members" })
    },
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create organization</CardTitle>
        <CardDescription>
          Set up a workspace for your team and projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="create-org-form"
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
                      onChange={(e) => {
                        const name = e.target.value
                        field.handleChange(name)
                        if (!slugTouched) {
                          form.setFieldValue("slug", slugify(name))
                        }
                      }}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="slug">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        setSlugTouched(true)
                        field.handleChange(slugify(e.target.value))
                      }}
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
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              form="create-org-form"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {isSubmitting ? "Creating…" : "Create organization"}
            </Button>
          )}
        </form.Subscribe>
      </CardFooter>
    </Card>
  )
}
