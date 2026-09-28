import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq, max } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { issueStatus, team } from "@/db/schema"
import { requireTeamInOrg } from "@/lib/server/access"
import { requireOrgSession } from "@/lib/server/session"
import { generateUUID } from "@/lib/utils"

export const STATUS_CATEGORIES = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
  "duplicate",
] as const

export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  triage: "Triage",
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  canceled: "Canceled",
  duplicate: "Duplicate",
}

/** Display order of hard categories (matches Linear). */
export const STATUS_CATEGORY_ORDER: StatusCategory[] = [...STATUS_CATEGORIES]

/** Categories that have exactly one built-in status (no custom add). */
export const FIXED_STATUS_CATEGORIES = ["triage", "duplicate"] as const

export type FixedStatusCategory = (typeof FIXED_STATUS_CATEGORIES)[number]

export function isFixedStatusCategory(
  category: string
): category is FixedStatusCategory {
  return (FIXED_STATUS_CATEGORIES as readonly string[]).includes(category)
}

const categorySchema = z.enum(STATUS_CATEGORIES)

const creatableCategorySchema = z.enum(
  STATUS_CATEGORIES.filter((c) => !isFixedStatusCategory(c)) as [
    Exclude<StatusCategory, FixedStatusCategory>,
    ...Exclude<StatusCategory, FixedStatusCategory>[],
  ]
)

type StatusSeed = {
  name: string
  category: StatusCategory
  description: string | null
  sortOrder: number
  isDefault?: boolean
}

/** Engineering delivery workflow (dev → QA → release). */
const ENGINEERING_STATUS_SEEDS: StatusSeed[] = [
  {
    name: "Triage",
    category: "triage",
    description: "Issue needs to be triaged",
    sortOrder: 0,
  },
  {
    name: "Backlog",
    category: "backlog",
    description: null,
    sortOrder: 0,
    isDefault: true,
  },
  {
    name: "Todo",
    category: "unstarted",
    description: null,
    sortOrder: 0,
  },
  {
    name: "In Progress",
    category: "started",
    description: null,
    sortOrder: 0,
  },
  {
    name: "QA-Failed",
    category: "started",
    description: "Product has failed the ticket — needs rework",
    sortOrder: 0,
  },
  {
    name: "Blocked",
    category: "started",
    description:
      "When a ticket cannot continue due to external circumstances",
    sortOrder: 1,
  },
  {
    name: "Code Review",
    category: "started",
    description: "Pull request is being reviewed prior to merging into dev",
    sortOrder: 2,
  },
  {
    name: "In Dev",
    category: "started",
    description: "Code is on the dev branch being tested",
    sortOrder: 3,
  },
  {
    name: "Ready4QA",
    category: "started",
    description:
      "Engineering has approved the ticket, awaiting deployment to product",
    sortOrder: 4,
  },
  {
    name: "QA-Product",
    category: "started",
    description: "Code is on the product branch, awaiting Product QA",
    sortOrder: 5,
  },
  {
    name: "Ready4Release",
    category: "started",
    description:
      "Product has approved the ticket, awaiting deployment to release-candidate",
    sortOrder: 6,
  },
  {
    name: "In RC",
    category: "started",
    description: "Integrated testing on release-candidate prior to main",
    sortOrder: 7,
  },
  {
    name: "Done",
    category: "completed",
    description: null,
    sortOrder: 0,
  },
  {
    name: "Canceled",
    category: "canceled",
    description: null,
    sortOrder: 0,
  },
  {
    name: "Duplicate",
    category: "duplicate",
    description: "Issue is a duplicate of another",
    sortOrder: 0,
  },
]

/** Product management workflow (discovery → plan → ship). */
const PRODUCT_STATUS_SEEDS: StatusSeed[] = [
  {
    name: "Triage",
    category: "triage",
    description: "New request — needs prioritization",
    sortOrder: 0,
  },
  {
    name: "Backlog",
    category: "backlog",
    description: "Accepted but not yet planned",
    sortOrder: 0,
    isDefault: true,
  },
  {
    name: "Icebox",
    category: "backlog",
    description: "Parked for later; revisit when capacity allows",
    sortOrder: 1,
  },
  {
    name: "Planned",
    category: "unstarted",
    description: "Committed for an upcoming cycle",
    sortOrder: 0,
  },
  {
    name: "Todo",
    category: "unstarted",
    description: "Ready to start this cycle",
    sortOrder: 1,
  },
  {
    name: "Discovery",
    category: "started",
    description: "Research, problem framing, or solution exploration",
    sortOrder: 0,
  },
  {
    name: "In Progress",
    category: "started",
    description: "Actively being designed or specified",
    sortOrder: 1,
  },
  {
    name: "In Review",
    category: "started",
    description: "Awaiting stakeholder, design, or leadership feedback",
    sortOrder: 2,
  },
  {
    name: "Blocked",
    category: "started",
    description: "Waiting on a decision, dependency, or external input",
    sortOrder: 3,
  },
  {
    name: "Done",
    category: "completed",
    description: "Shipped or otherwise complete",
    sortOrder: 0,
  },
  {
    name: "Canceled",
    category: "canceled",
    description: "Won't do",
    sortOrder: 0,
  },
  {
    name: "Duplicate",
    category: "duplicate",
    description: "Duplicate of another issue",
    sortOrder: 0,
  },
]

function isProductTeam(name: string, identifier: string | null) {
  const haystack = `${name} ${identifier ?? ""}`.toLowerCase()
  return /\b(product|pm|prd)\b/.test(haystack)
}

function seedsForTeam(name: string, identifier: string | null): StatusSeed[] {
  return isProductTeam(name, identifier)
    ? PRODUCT_STATUS_SEEDS
    : ENGINEERING_STATUS_SEEDS
}

function categoryRank(category: string) {
  const idx = STATUS_CATEGORY_ORDER.indexOf(category as StatusCategory)
  return idx === -1 ? 999 : idx
}

async function ensureTeamStatuses(teamId: string) {
  const [existing] = await db
    .select({ id: issueStatus.id })
    .from(issueStatus)
    .where(eq(issueStatus.teamId, teamId))
    .limit(1)
  // Only seed empty teams — never re-add defaults onto a customized workflow.
  if (existing) return

  const [owned] = await db
    .select({ name: team.name, identifier: team.identifier })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (!owned) return

  const seeds = seedsForTeam(owned.name, owned.identifier)
  await db.insert(issueStatus).values(
    seeds.map((seed) => ({
      id: generateUUID(),
      teamId,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      sortOrder: seed.sortOrder,
      isDefault: seed.isDefault ?? false,
    }))
  )
}

function sortStatuses<
  T extends { category: string; sortOrder: number; name: string },
>(rows: T[]) {
  return rows.sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name)
  )
}

export const listStatuses = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)
    await ensureTeamStatuses(data.teamId)

    const rows = await db
      .select()
      .from(issueStatus)
      .where(eq(issueStatus.teamId, data.teamId))
      .orderBy(asc(issueStatus.sortOrder), asc(issueStatus.name))

    return sortStatuses(rows)
  })

export const getStatus = createServerFn({ method: "GET" })
  .validator(
    z.object({
      id: z.string().min(1),
      teamId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    const [row] = await db
      .select()
      .from(issueStatus)
      .where(
        and(eq(issueStatus.id, data.id), eq(issueStatus.teamId, data.teamId))
      )
      .limit(1)
    if (!row) throw new Error("Status not found")
    return row
  })

export const createStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      name: z.string().min(1, "Name is required").max(64),
      category: creatableCategorySchema,
      description: z.string().max(500).optional(),
      isDefault: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    const name = data.name.trim()
    if (!name) throw new Error("Name is required")
    if (isFixedStatusCategory(data.category)) {
      throw new Error(
        `${STATUS_CATEGORY_LABELS[data.category]} has a single fixed status`
      )
    }

    return db.transaction(async (tx) => {
      const [dup] = await tx
        .select({ id: issueStatus.id })
        .from(issueStatus)
        .where(
          and(
            eq(issueStatus.teamId, data.teamId),
            eq(issueStatus.name, name)
          )
        )
        .limit(1)
      if (dup) throw new Error("A status with that name already exists")

      const [maxRow] = await tx
        .select({ maxSort: max(issueStatus.sortOrder) })
        .from(issueStatus)
        .where(
          and(
            eq(issueStatus.teamId, data.teamId),
            eq(issueStatus.category, data.category)
          )
        )

      const nextSort = (maxRow?.maxSort ?? -1) + 1
      const makeDefault = data.isDefault === true

      if (makeDefault) {
        await tx
          .update(issueStatus)
          .set({ isDefault: false })
          .where(
            and(
              eq(issueStatus.teamId, data.teamId),
              eq(issueStatus.isDefault, true)
            )
          )
      }

      const [row] = await tx
        .insert(issueStatus)
        .values({
          id: generateUUID(),
          teamId: data.teamId,
          name,
          category: data.category,
          description: data.description?.trim() || null,
          sortOrder: nextSort,
          isDefault: makeDefault,
        })
        .returning()

      return row
    })
  })

export const updateStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      teamId: z.string().min(1),
      name: z.string().min(1).max(64).optional(),
      description: z.string().max(500).nullable().optional(),
      category: categorySchema.optional(),
      isDefault: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(issueStatus)
        .where(
          and(eq(issueStatus.id, data.id), eq(issueStatus.teamId, data.teamId))
        )
        .limit(1)
      if (!existing) throw new Error("Status not found")

      const patch: {
        name?: string
        description?: string | null
        category?: StatusCategory
        sortOrder?: number
        isDefault?: boolean
      } = {}

      if (data.name !== undefined) {
        const name = data.name.trim()
        const [dup] = await tx
          .select({ id: issueStatus.id })
          .from(issueStatus)
          .where(
            and(
              eq(issueStatus.teamId, data.teamId),
              eq(issueStatus.name, name)
            )
          )
          .limit(1)
        if (dup && dup.id !== data.id) {
          throw new Error("A status with that name already exists")
        }
        patch.name = name
      }
      if (data.description !== undefined) {
        patch.description = data.description?.trim() || null
      }
      if (data.isDefault === true) {
        await tx
          .update(issueStatus)
          .set({ isDefault: false })
          .where(
            and(
              eq(issueStatus.teamId, data.teamId),
              eq(issueStatus.isDefault, true)
            )
          )
        patch.isDefault = true
      } else if (data.isDefault === false) {
        patch.isDefault = false
      }

      if (data.category !== undefined && data.category !== existing.category) {
        if (isFixedStatusCategory(data.category)) {
          throw new Error(
            `${STATUS_CATEGORY_LABELS[data.category]} has a single fixed status`
          )
        }
        if (isFixedStatusCategory(existing.category)) {
          throw new Error(
            `Cannot move ${STATUS_CATEGORY_LABELS[existing.category as StatusCategory]} status`
          )
        }
        const [maxRow] = await tx
          .select({ maxSort: max(issueStatus.sortOrder) })
          .from(issueStatus)
          .where(
            and(
              eq(issueStatus.teamId, data.teamId),
              eq(issueStatus.category, data.category)
            )
          )
        patch.category = data.category
        patch.sortOrder = (maxRow?.maxSort ?? -1) + 1
      }

      const [row] = await tx
        .update(issueStatus)
        .set(patch)
        .where(
          and(eq(issueStatus.id, data.id), eq(issueStatus.teamId, data.teamId))
        )
        .returning()

      return row
    })
  })

export const deleteStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      teamId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    const [owned] = await db
      .select({
        id: issueStatus.id,
        isDefault: issueStatus.isDefault,
        category: issueStatus.category,
      })
      .from(issueStatus)
      .where(
        and(eq(issueStatus.id, data.id), eq(issueStatus.teamId, data.teamId))
      )
      .limit(1)
    if (!owned) throw new Error("Status not found")
    if (owned.isDefault) {
      throw new Error("Cannot delete the default status")
    }
    if (isFixedStatusCategory(owned.category)) {
      throw new Error(
        `Cannot delete ${STATUS_CATEGORY_LABELS[owned.category]} status`
      )
    }

    await db
      .delete(issueStatus)
      .where(
        and(eq(issueStatus.id, data.id), eq(issueStatus.teamId, data.teamId))
      )
    return { ok: true as const }
  })
