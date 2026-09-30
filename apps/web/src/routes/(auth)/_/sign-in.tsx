import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { SignInForm } from "@/components/auth/sign-in-form"

const signInSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/(auth)/_/sign-in")({
  validateSearch: signInSearchSchema,
  component: SignInPage,
})

function SignInPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return <SignInForm redirectTo={safeRedirect(redirectTo)} />
}

/** Only allow same-origin relative paths to avoid open redirects. */
function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined
  }
  return value
}
