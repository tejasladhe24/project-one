import { createFileRoute } from "@tanstack/react-router"
import { IssueView } from "@/components/issue/issue-view"
import { getIssue } from "@/lib/issues"

export const Route = createFileRoute("/(app)/_/issue/$issueId")({
  loader: async ({ params, context }) => {
    const issue = await getIssue({ data: { issueId: params.issueId } })
    return {
      issue,
      currentUserId: context.session.user.id,
    }
  },
  component: IssuePage,
})

function IssuePage() {
  const { issue, currentUserId } = Route.useLoaderData()

  return (
    <div className="mx-auto flex h-[calc(100svh-var(--header-height))] min-h-0 w-full max-w-5xl flex-col">
      <IssueView issue={issue} currentUserId={currentUserId} />
    </div>
  )
}
