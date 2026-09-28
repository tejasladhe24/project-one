import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
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

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(256, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export function SignUpForm({
  redirectTo = "/select-org",
}: {
  redirectTo?: string
}) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)
  const afterAuthPath = redirectTo || "/select-org"

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      setSuccess(null)

      const { error } = await authClient.signUp.email({
        name: value.name.trim(),
        email: value.email.trim(),
        password: value.password,
        callbackURL: afterAuthPath,
      })

      if (error) {
        setFormError(error.message ?? "Could not create account")
        return
      }

      setSuccess(
        "Account created. Check your email to verify, or sign in if verification is not required."
      )
      form.reset()
      void navigate({ href: afterAuthPath })
    },
  })

  const signUpWithGoogle = async () => {
    setFormError(null)
    setGooglePending(true)
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: afterAuthPath,
      })
      if (error) {
        setFormError(error.message ?? "Could not sign up with Google")
        setGooglePending(false)
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not sign up with Google"
      )
      setGooglePending(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Sign up with email and password, or continue with Google
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          id="sign-up-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
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
                      autoComplete="name"
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

            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="email"
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

            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="new-password"
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

            <form.Field name="confirmPassword">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="new-password"
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
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={googlePending}
          onClick={() => void signUpWithGoogle()}
        >
          {googlePending ? <Spinner data-icon="inline-start" /> : null}
          {googlePending ? "Redirecting…" : "Continue with Google"}
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              form="sign-up-form"
              className="w-full"
              disabled={isSubmitting || googlePending}
            >
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          )}
        </form.Subscribe>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/sign-in"
            search={{ redirect: redirectTo === "/select-org" ? undefined : redirectTo }}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
