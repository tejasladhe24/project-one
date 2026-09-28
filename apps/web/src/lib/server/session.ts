import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth/server"

export type OrgSession = Awaited<ReturnType<typeof auth.api.getSession>> & {}

export async function requireOrgSession() {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error("Unauthorized")
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) throw new Error("No active organization")
  return { headers, session, organizationId }
}

/** For list endpoints that return [] when unauthenticated / no active org. */
export async function getOptionalOrgSession() {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  const organizationId = session?.session.activeOrganizationId ?? null
  if (!session || !organizationId) {
    return { headers, session: null, organizationId: null }
  }
  return { headers, session, organizationId }
}
