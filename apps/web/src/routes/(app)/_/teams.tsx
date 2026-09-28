import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  TeamsTable,
  type TeamRow,
} from "@/components/teams/teams-table"
import { listOrgTeamsWithMembership } from "@/lib/teams"

function toTeamRows(
  data: Awaited<ReturnType<typeof listOrgTeamsWithMembership>>
): TeamRow[] {
  return data.map((team) => ({
    id: team.id,
    name: team.name,
    memberCount: team.memberCount,
    createdAt:
      typeof team.createdAt === "string"
        ? team.createdAt
        : new Date(team.createdAt).toISOString(),
    isMember: team.isMember,
  }))
}

export const Route = createFileRoute("/(app)/_/teams")({
  loader: async () => {
    const data = await listOrgTeamsWithMembership()
    return { teams: toTeamRows(data) }
  },
  component: TeamsPage,
})

function TeamsPage() {
  const { teams } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <TeamsTable
        data={teams}
        onCreated={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
