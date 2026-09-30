import { createFileRoute } from "@tanstack/react-router"
import { IssueView } from "@/components/issue/issue-view"
import { getIssue } from "@/lib/issues"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/issue/$issueId")({
  loader: async ({ params, context }) => {
    const issue = await getIssue({ data: { issueId: params.issueId } })
    return {
      issue,
      currentUserId: context.session.user.id,
    }
  },
  head: ({ loaderData }) => {
    const issue = loaderData?.issue
    const number = typeof issue?.number === "number" ? issue.number : undefined
    const teamIdentifier =
      typeof issue?.teamIdentifier === "string" ? issue.teamIdentifier : null
    const key =
      number != null
        ? `${(teamIdentifier ?? "ISS").toUpperCase()}-${String(number).padStart(4, "0")}`
        : null
    const title = issue?.title
      ? key
        ? `${key} · ${issue.title}`
        : issue.title
      : "Issue"
    return pageMeta({ title, noIndex: true })
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
