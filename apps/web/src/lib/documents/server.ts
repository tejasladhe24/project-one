import { createServerFn } from "@tanstack/react-start"
import { and, asc, desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"
import { db } from "@/db"
import { issue, project, team, teamDocument, user } from "@/db/schema"
import { requireProjectInOrg, requireTeamInOrg } from "@/lib/server/access"
import { requireOrgSession } from "@/lib/server/session"
import { generateUUID } from "@/lib/utils"

const owner = alias(user, "document_owner")

async function assertProjectInOrg(
  projectId: string | null | undefined,
  organizationId: string
) {
  if (!projectId) return
  await requireProjectInOrg(projectId, organizationId)
}

async function assertIssueOnTeam(
  issueId: string | null | undefined,
  teamId: string
) {
  if (!issueId) return
  const [row] = await db
    .select({ id: issue.id })
    .from(issue)
    .where(and(eq(issue.id, issueId), eq(issue.teamId, teamId)))
    .limit(1)
  if (!row) throw new Error("Issue not found")
}

export const listTeamDocuments = createServerFn({ method: "GET" })
  .validator(z.object({ teamId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    return db
      .select({
        id: teamDocument.id,
        title: teamDocument.title,
        teamId: teamDocument.teamId,
        projectId: teamDocument.projectId,
        projectName: project.name,
        issueId: teamDocument.issueId,
        issueNumber: issue.number,
        issueTitle: issue.title,
        ownerId: teamDocument.ownerId,
        ownerName: owner.name,
        ownerImage: owner.image,
        createdAt: teamDocument.createdAt,
        updatedAt: teamDocument.updatedAt,
      })
      .from(teamDocument)
      .leftJoin(project, eq(teamDocument.projectId, project.id))
      .leftJoin(issue, eq(teamDocument.issueId, issue.id))
      .leftJoin(owner, eq(teamDocument.ownerId, owner.id))
      .where(eq(teamDocument.teamId, data.teamId))
      .orderBy(desc(teamDocument.updatedAt), asc(teamDocument.title))
  })

export const getTeamDocument = createServerFn({ method: "GET" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      documentId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    const [row] = await db
      .select({
        id: teamDocument.id,
        title: teamDocument.title,
        content: teamDocument.content,
        teamId: teamDocument.teamId,
        teamName: team.name,
        teamIdentifier: team.identifier,
        projectId: teamDocument.projectId,
        projectName: project.name,
        issueId: teamDocument.issueId,
        issueNumber: issue.number,
        issueTitle: issue.title,
        ownerId: teamDocument.ownerId,
        ownerName: owner.name,
        ownerImage: owner.image,
        createdAt: teamDocument.createdAt,
        updatedAt: teamDocument.updatedAt,
      })
      .from(teamDocument)
      .innerJoin(team, eq(teamDocument.teamId, team.id))
      .leftJoin(project, eq(teamDocument.projectId, project.id))
      .leftJoin(issue, eq(teamDocument.issueId, issue.id))
      .leftJoin(owner, eq(teamDocument.ownerId, owner.id))
      .where(
        and(
          eq(teamDocument.id, data.documentId),
          eq(teamDocument.teamId, data.teamId)
        )
      )
      .limit(1)

    if (!row) throw new Error("Document not found")
    return row
  })

export const createTeamDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      title: z.string().min(1).max(200),
      content: z.string().max(200_000).optional(),
      projectId: z.string().min(1).nullable().optional(),
      issueId: z.string().min(1).nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)
    await assertProjectInOrg(data.projectId, organizationId)
    await assertIssueOnTeam(data.issueId, data.teamId)

    const [row] = await db
      .insert(teamDocument)
      .values({
        id: generateUUID(),
        teamId: data.teamId,
        title: data.title.trim(),
        content: data.content?.trim() || null,
        projectId: data.projectId || null,
        issueId: data.issueId || null,
        ownerId: session.user.id,
      })
      .returning()

    return row
  })

export const updateTeamDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      documentId: z.string().min(1),
      title: z.string().min(1).max(200).optional(),
      content: z.string().max(200_000).nullable().optional(),
      projectId: z.string().min(1).nullable().optional(),
      issueId: z.string().min(1).nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    const [existing] = await db
      .select({ id: teamDocument.id })
      .from(teamDocument)
      .where(
        and(
          eq(teamDocument.id, data.documentId),
          eq(teamDocument.teamId, data.teamId)
        )
      )
      .limit(1)
    if (!existing) throw new Error("Document not found")

    if (data.projectId !== undefined) {
      await assertProjectInOrg(data.projectId, organizationId)
    }
    if (data.issueId !== undefined) {
      await assertIssueOnTeam(data.issueId, data.teamId)
    }

    const patch: {
      title?: string
      content?: string | null
      projectId?: string | null
      issueId?: string | null
    } = {}
    if (data.title !== undefined) patch.title = data.title.trim()
    if (data.content !== undefined) {
      patch.content = data.content?.trim() || null
    }
    if (data.projectId !== undefined) patch.projectId = data.projectId
    if (data.issueId !== undefined) patch.issueId = data.issueId

    const [row] = await db
      .update(teamDocument)
      .set(patch)
      .where(eq(teamDocument.id, data.documentId))
      .returning()

    return row
  })

export const deleteTeamDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teamId: z.string().min(1),
      documentId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await requireTeamInOrg(data.teamId, organizationId)

    const deleted = await db
      .delete(teamDocument)
      .where(
        and(
          eq(teamDocument.id, data.documentId),
          eq(teamDocument.teamId, data.teamId)
        )
      )
      .returning({ id: teamDocument.id })

    if (deleted.length === 0) throw new Error("Document not found")
    return { ok: true as const }
  })

/** Documents linked to a project (any team in the org). */
export const listProjectDocuments = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await assertProjectInOrg(data.projectId, organizationId)

    return db
      .select({
        id: teamDocument.id,
        title: teamDocument.title,
        teamId: teamDocument.teamId,
        teamName: team.name,
        teamIdentifier: team.identifier,
        ownerId: teamDocument.ownerId,
        ownerName: owner.name,
        ownerImage: owner.image,
        updatedAt: teamDocument.updatedAt,
      })
      .from(teamDocument)
      .innerJoin(team, eq(teamDocument.teamId, team.id))
      .leftJoin(owner, eq(teamDocument.ownerId, owner.id))
      .where(
        and(
          eq(teamDocument.projectId, data.projectId),
          eq(team.organizationId, organizationId)
        )
      )
      .orderBy(asc(teamDocument.title))
  })

/** Org documents not yet linked to this project (for the link combobox). */
export const listDocumentsForProjectLink = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await assertProjectInOrg(data.projectId, organizationId)

    const rows = await db
      .select({
        id: teamDocument.id,
        title: teamDocument.title,
        teamId: teamDocument.teamId,
        teamName: team.name,
        teamIdentifier: team.identifier,
        projectId: teamDocument.projectId,
      })
      .from(teamDocument)
      .innerJoin(team, eq(teamDocument.teamId, team.id))
      .where(eq(team.organizationId, organizationId))
      .orderBy(asc(teamDocument.title))

    return rows.filter((row) => row.projectId !== data.projectId)
  })

export const linkDocumentToProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      documentId: z.string().min(1),
      teamId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await assertProjectInOrg(data.projectId, organizationId)
    await requireTeamInOrg(data.teamId, organizationId)

    const [existing] = await db
      .select({ id: teamDocument.id })
      .from(teamDocument)
      .where(
        and(
          eq(teamDocument.id, data.documentId),
          eq(teamDocument.teamId, data.teamId)
        )
      )
      .limit(1)
    if (!existing) throw new Error("Document not found")

    const [row] = await db
      .update(teamDocument)
      .set({ projectId: data.projectId })
      .where(eq(teamDocument.id, data.documentId))
      .returning({ id: teamDocument.id, projectId: teamDocument.projectId })

    return row
  })

export const unlinkDocumentFromProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      documentId: z.string().min(1),
      teamId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { organizationId } = await requireOrgSession()
    await assertProjectInOrg(data.projectId, organizationId)
    await requireTeamInOrg(data.teamId, organizationId)

    const [existing] = await db
      .select({ id: teamDocument.id, projectId: teamDocument.projectId })
      .from(teamDocument)
      .where(
        and(
          eq(teamDocument.id, data.documentId),
          eq(teamDocument.teamId, data.teamId)
        )
      )
      .limit(1)
    if (!existing || existing.projectId !== data.projectId) {
      throw new Error("Document not found on this project")
    }

    await db
      .update(teamDocument)
      .set({ projectId: null })
      .where(eq(teamDocument.id, data.documentId))

    return { ok: true as const }
  })

/**
 * Create a document from an uploaded local file and link it to the project.
 * Text files become document content; other types create a stub with the filename.
 */
export const attachFileToProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      teamId: z.string().min(1),
      fileName: z.string().min(1).max(200),
      content: z.string().max(200_000).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireOrgSession()
    await assertProjectInOrg(data.projectId, organizationId)
    await requireTeamInOrg(data.teamId, organizationId)

    const title = data.fileName.replace(/\.[^.]+$/, "").trim() || data.fileName
    const content =
      data.content?.trim() ||
      `_Attached file: ${data.fileName}_\n\n(Binary or empty file — open the original on your machine.)`

    const [row] = await db
      .insert(teamDocument)
      .values({
        id: generateUUID(),
        teamId: data.teamId,
        projectId: data.projectId,
        title: title.slice(0, 200),
        content,
        ownerId: session.user.id,
      })
      .returning()

    return row
  })
