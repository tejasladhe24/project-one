import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { orgSessionStore } from "@/lib/server/session"

function getAuthHeaders() {
  return orgSessionStore.getStore()?.headers ?? getRequestHeaders()
}

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getAuthHeaders()
    return auth.api.getSession({ headers })
  }
)

export const getInvitation = createServerFn({ method: "GET" })
  .validator(z.object({ invitationId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const headers = getAuthHeaders()
    try {
      const invitation = await auth.api.getInvitation({
        headers,
        query: { id: data.invitationId },
      })
      return { invitation, error: null as string | null }
    } catch (error) {
      return {
        invitation: null,
        error: error instanceof Error ? error.message : "Invitation not found",
      }
    }
  })

export const listOrganizations = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getAuthHeaders()
    return auth.api.listOrganizations({ headers })
  }
)

export const listMembers = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getAuthHeaders()
    const organizationId = orgSessionStore.getStore()?.organizationId
    return auth.api.listMembers({
      headers,
      ...(organizationId ? { query: { organizationId } } : {}),
    })
  }
)

export const listOrganizationTeams = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getAuthHeaders()
    return auth.api.listOrganizationTeams({ headers })
  }
)

/** Teams the current user belongs to (scoped to the active organization). */
export const listUserTeams = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getAuthHeaders()
    const stored = orgSessionStore.getStore()
    const session = stored?.session ?? (await auth.api.getSession({ headers }))
    const organizationId =
      stored?.organizationId ?? session?.session.activeOrganizationId
    if (!organizationId) return []

    return auth.api.listUserTeams({
      headers,
      query: { organizationId },
    })
  }
)
