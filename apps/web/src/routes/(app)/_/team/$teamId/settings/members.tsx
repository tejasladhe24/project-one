import { createFileRoute } from "@tanstack/react-router"
import { TeamMembersSettings } from "@/components/teams/team-members-settings"
import {
  listOrgMembersForTeamAdd,
  listTeamJoinRequests,
  listTeamMembersDetailed,
} from "@/lib/teams"

export const Route = createFileRoute("/(app)/_/team/$teamId/settings/members")({
  loader: async ({ params, context }) => {
    const team = context.team
    const [members, candidates, invitations] = await Promise.all([
      listTeamMembersDetailed({ data: { teamId: params.teamId } }),
      listOrgMembersForTeamAdd({ data: { teamId: params.teamId } }),
      listTeamJoinRequests({ data: { teamId: params.teamId } }),
    ])

    return {
      team,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email,
        image: m.image,
        role: m.role,
        createdAt: m.createdAt
          ? typeof m.createdAt === "string"
            ? m.createdAt
            : new Date(m.createdAt).toISOString()
          : null,
      })),
      candidates: candidates.map((c) => ({
        userId: c.userId,
        name: c.name,
        email: c.email,
        image: c.image,
        role: c.role,
      })),
      invitations: invitations.map((invite) => ({
        id: invite.id,
        actorId: invite.actorId,
        actorName: invite.actorName,
        actorEmail: invite.actorEmail,
        actorImage: invite.actorImage,
        createdAt:
          typeof invite.createdAt === "string"
            ? invite.createdAt
            : new Date(invite.createdAt).toISOString(),
      })),
    }
  },
  component: TeamMembersPage,
})

function TeamMembersPage() {
  const { team, members, candidates, invitations } = Route.useLoaderData()

  return (
    <TeamMembersSettings
      teamId={team.id}
      teamName={team.name}
      members={members}
      candidates={candidates}
      invitations={invitations}
    />
  )
}
