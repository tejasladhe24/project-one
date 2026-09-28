import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"
import { InboxView } from "@/components/inbox/inbox-view"
import { listInboxNotifications } from "@/lib/inbox"

const inboxSearchSchema = z.object({
  n: z.string().optional(),
})

export const Route = createFileRoute("/(app)/_/inbox")({
  validateSearch: inboxSearchSchema,
  loaderDeps: ({ search }) => ({ notificationId: search.n }),
  loader: async ({ deps }) => {
    const notifications = await listInboxNotifications()

    const selectedId =
      deps.notificationId &&
      notifications.some((n) => n.id === deps.notificationId)
        ? deps.notificationId
        : (notifications[0]?.id ?? null)

    if (!deps.notificationId && selectedId) {
      throw redirect({
        to: "/inbox",
        search: { n: selectedId },
        replace: true,
      })
    }

    return { notifications, selectedId }
  },
  component: InboxPage,
})

function InboxPage() {
  const { notifications, selectedId } = Route.useLoaderData()

  return <InboxView notifications={notifications} selectedId={selectedId} />
}
