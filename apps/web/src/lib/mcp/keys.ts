import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { requireOrgSession } from "@/lib/server/session"

export type McpApiKeyRow = {
  id: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean
  createdAt: string
  expiresAt: string | null
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === "string") return value
  return value.toISOString()
}

function normalizeKey(key: {
  id: string
  name?: string | null
  start?: string | null
  prefix?: string | null
  enabled?: boolean
  createdAt?: Date | string
  expiresAt?: Date | string | null
}): McpApiKeyRow {
  return {
    id: key.id,
    name: key.name ?? null,
    start: key.start ?? null,
    prefix: key.prefix ?? null,
    enabled: key.enabled ?? true,
    createdAt: toIso(key.createdAt) ?? new Date().toISOString(),
    expiresAt: toIso(key.expiresAt),
  }
}

/** Create a personal API key scoped to the active organization (for MCP). */
export const createMcpApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1).max(64).default("cursor-mcp"),
      /** Expiration in seconds; omit for no expiry. */
      expiresIn: z.number().int().positive().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { headers, session, organizationId } = await requireOrgSession()

    const created = await auth.api.createApiKey({
      headers,
      body: {
        name: data.name,
        ...(data.expiresIn != null ? { expiresIn: data.expiresIn } : {}),
        metadata: { organizationId },
      },
    })

    return {
      ...normalizeKey(created),
      key: created.key as string,
      organizationId,
      userId: session.user.id,
    }
  })

export const listMcpApiKeys = createServerFn({ method: "GET" }).handler(
  async (): Promise<McpApiKeyRow[]> => {
    const { headers } = await requireOrgSession()
    const result = await auth.api.listApiKeys({ headers })

    const keys = Array.isArray(result)
      ? result
      : ((result as { apiKeys?: unknown[] }).apiKeys ?? [])

    return keys.map((key) =>
      normalizeKey(key as Parameters<typeof normalizeKey>[0])
    )
  }
)

export const updateMcpApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      keyId: z.string().min(1),
      name: z.string().min(1).max(64),
    })
  )
  .handler(async ({ data }) => {
    const { headers } = await requireOrgSession()
    const updated = await auth.api.updateApiKey({
      headers,
      body: {
        keyId: data.keyId,
        name: data.name,
      },
    })
    return normalizeKey(updated)
  })

export const revokeMcpApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ keyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { headers } = await requireOrgSession()
    return auth.api.deleteApiKey({
      headers,
      body: { keyId: data.keyId },
    })
  })
