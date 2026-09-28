import { eq } from "drizzle-orm"
import { db } from "@/db"
import { user } from "@/db/schema"
import { auth } from "@/lib/auth/server"
import { requireOrgMember } from "@/lib/server/access"
import type { OrgSession, OrgSessionContext } from "@/lib/server/session"

function parseMetadata(
  raw: string | Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

function extractApiKey(request: Request): string | null {
  const fromHeader = request.headers.get("x-api-key")?.trim()
  if (fromHeader) return fromHeader

  const authHeader = request.headers.get("authorization")?.trim()
  if (!authHeader) return null
  const match = /^Bearer\s+(.+)$/i.exec(authHeader)
  return match?.[1]?.trim() || null
}

/**
 * Authenticate an MCP HTTP request via Better Auth API key.
 * Organization comes from `X-Organization-Id` or key metadata.organizationId.
 */
export async function requireMcpAuth(
  request: Request
): Promise<OrgSessionContext> {
  const key = extractApiKey(request)
  if (!key) {
    throw new McpAuthError(
      "Missing API key (x-api-key or Authorization: Bearer)"
    )
  }

  const verified = await auth.api.verifyApiKey({
    body: { key },
  })

  if (!verified.valid || !verified.key) {
    throw new McpAuthError("Invalid API key", 401)
  }

  const userId = verified.key.referenceId
  const metadata = parseMetadata(
    verified.key.metadata as string | Record<string, unknown> | null
  )
  const organizationId =
    request.headers.get("x-organization-id")?.trim() ||
    (typeof metadata.organizationId === "string"
      ? metadata.organizationId
      : null)

  if (!organizationId) {
    throw new McpAuthError(
      "Organization required: set X-Organization-Id or create the key with metadata.organizationId",
      400
    )
  }

  await requireOrgMember(userId, organizationId)

  const [userRow] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!userRow) throw new McpAuthError("User not found", 401)

  const now = new Date()
  const session = {
    user: userRow,
    session: {
      id: `mcp:${verified.key.id}`,
      userId,
      expiresAt: verified.key.expiresAt ?? new Date(now.getTime() + 86_400_000),
      token: key,
      createdAt: verified.key.createdAt ?? now,
      updatedAt: verified.key.updatedAt ?? now,
      ipAddress: null,
      userAgent: request.headers.get("user-agent"),
      activeOrganizationId: organizationId,
      activeTeamId: null,
    },
  } as OrgSession

  // Preserve incoming headers (incl. x-api-key) for Better Auth API calls.
  return {
    headers: request.headers,
    session,
    organizationId,
  }
}

export class McpAuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.name = "McpAuthError"
    this.status = status
  }
}
