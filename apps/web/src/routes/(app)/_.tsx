import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getSession, listOrganizations } from "@/lib/auth/session"
import { listSidebarTeams } from "@/lib/cycles"
import { pageMeta } from "@/lib/seo"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export const Route = createFileRoute("/(app)/_")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/sign-in" })
    }
    if (!session.session.activeOrganizationId) {
      throw redirect({ to: "/select-org" })
    }
    return { session }
  },
  loader: async ({ context }) => {
    const [teams, orgs] = await Promise.all([
      listSidebarTeams(),
      listOrganizations(),
    ])
    const activeTeamId = context.session.session.activeTeamId
    const activeOrgId = context.session.session.activeOrganizationId
    const user = context.session.user

    return {
      user: {
        name: user.name,
        email: user.email,
        avatar: user.image ?? null,
      },
      orgs: (orgs ?? []).map((org) => ({
        id: org.id,
        title: org.name,
        slug: org.slug,
        logoUrl: org.logo ?? null,
        isActive: org.id === activeOrgId,
      })),
      teams: teams.map((team) => ({
        id: team.id,
        title: team.name,
        url: "#",
        isActive: team.id === activeTeamId,
        cyclesEnabled: team.cyclesEnabled,
      })),
    }
  },
  head: () =>
    pageMeta({
      noIndex: true,
    }),
  component: AppLayout,
})

function AppLayout() {
  const { teams, orgs, user } = Route.useLoaderData()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" teams={teams} orgs={orgs} user={user} />
      <SidebarInset>
        <SiteHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
