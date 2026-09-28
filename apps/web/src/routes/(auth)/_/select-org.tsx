import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { CreateOrgForm } from "@/components/auth/create-org-form"
import { authClient } from "@/lib/auth/client"
import { getSession, listOrganizations } from "@/lib/auth/session"

export const Route = createFileRoute("/(auth)/_/select-org")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/sign-in" })
    }
    return { session }
  },
  loader: async () => {
    const organizations = await listOrganizations()
    return { organizations: organizations ?? [] }
  },
  component: SelectOrgPage,
})

function SelectOrgPage() {
  const { organizations } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 md:flex-row md:items-start">
      <div className="flex-1">
        <CreateOrgForm />
      </div>

      <Card className="w-full max-w-md flex-1">
        <CardHeader>
          <CardTitle>Your organizations</CardTitle>
          <CardDescription>
            Select an organization to continue, or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any organization yet.
            </p>
          ) : (
            organizations.map((org) => (
              <Button
                key={org.id}
                variant="outline"
                className="justify-start"
                onClick={async () => {
                  await authClient.organization.setActive({
                    organizationId: org.id,
                  })
                  await router.navigate({ to: "/members" })
                }}
              >
                {org.name}
              </Button>
            ))
          )}
          <Button
            variant="ghost"
            className="mt-2 justify-start"
            render={<Link to="/" />}
            nativeButton={false}
          >
            Back to home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
