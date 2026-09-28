import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { label } from "@/db/schema"
import { generateUUID } from "@/lib/utils"
import { requireOrgSession } from "@/lib/server/session"

export const listLabels = createServerFn({ method: "GET" }).handler(
  async () => {
    const { organizationId } = await requireOrgSession()
    return db
      .select({
        id: label.id,
        name: label.name,
        organizationId: label.organizationId,
        createdAt: label.createdAt,
        updatedAt: label.updatedAt,
      })
      .from(label)
      .where(eq(label.organizationId, organizationId))
      .orderBy(asc(label.name))
  }
)

export const getLabel = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [row] = await db
      .select({
        id: label.id,
        name: label.name,
        organizationId: label.organizationId,
        createdAt: label.createdAt,
        updatedAt: label.updatedAt,
      })
      .from(label)
      .where(
        and(eq(label.id, data.id), eq(label.organizationId, organizationId))
      )
      .limit(1)

    if (!row) throw new Error("Label not found")
    return row
  })

export const createLabel = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1, "Name is required").max(64),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const name = data.name.trim()
    if (!name) throw new Error("Name is required")

    const [existing] = await db
      .select({ id: label.id })
      .from(label)
      .where(
        and(eq(label.organizationId, organizationId), eq(label.name, name))
      )
      .limit(1)
    if (existing) throw new Error("A label with that name already exists")

    const [created] = await db
      .insert(label)
      .values({
        id: generateUUID(),
        organizationId,
        name,
      })
      .returning()

    return created
  })

export const updateLabel = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1, "Name is required").max(64),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const name = data.name.trim()
    if (!name) throw new Error("Name is required")

    const [owned] = await db
      .select({ id: label.id })
      .from(label)
      .where(
        and(eq(label.id, data.id), eq(label.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Label not found")

    const [dup] = await db
      .select({ id: label.id })
      .from(label)
      .where(
        and(eq(label.organizationId, organizationId), eq(label.name, name))
      )
      .limit(1)
    if (dup && dup.id !== data.id) {
      throw new Error("A label with that name already exists")
    }

    const [updated] = await db
      .update(label)
      .set({ name })
      .where(
        and(eq(label.id, data.id), eq(label.organizationId, organizationId))
      )
      .returning()

    return updated
  })

export const deleteLabel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()

    const [owned] = await db
      .select({ id: label.id })
      .from(label)
      .where(
        and(eq(label.id, data.id), eq(label.organizationId, organizationId))
      )
      .limit(1)
    if (!owned) throw new Error("Label not found")

    await db
      .delete(label)
      .where(
        and(eq(label.id, data.id), eq(label.organizationId, organizationId))
      )
    return { ok: true as const }
  })
