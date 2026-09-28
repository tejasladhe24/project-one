import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { SignUpForm } from "@/components/auth/sign-up-form"

const signUpSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/(auth)/_/sign-up")({
  validateSearch: signUpSearchSchema,
  component: SignUpPage,
})

function SignUpPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <div className="m-auto flex w-full justify-center">
      <SignUpForm redirectTo={safeRedirect(redirectTo)} />
    </div>
  )
}

/** Only allow same-origin relative paths to avoid open redirects. */
function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined
  }
  return value
}
