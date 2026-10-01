import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { auth } from "@/lib/auth/server"
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
} from "@/lib/issues/server"
import {
  listIssueComments,
  createIssueComment,
  deleteIssueComment,
} from "@/lib/issues/comments"
import {
  getIssueTimeline,
  setIssueSubscription,
} from "@/lib/issues/issue-activity"
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listProjectActivity,
} from "@/lib/projects/server"
import {
  listProjectComments,
  createProjectComment,
  deleteProjectComment,
} from "@/lib/projects/comments"
import {
  listLabels,
  getLabel,
  createLabel,
  updateLabel,
  deleteLabel,
} from "@/lib/labels/server"
import {
  listStatuses,
  getStatus,
  createStatus,
  updateStatus,
  deleteStatus,
} from "@/lib/statuses/server"
import {
  listTeamDocuments,
  getTeamDocument,
  createTeamDocument,
  updateTeamDocument,
  deleteTeamDocument,
  listProjectDocuments,
  linkDocumentToProject,
  unlinkDocumentFromProject,
} from "@/lib/documents/server"
import {
  listInboxNotifications,
  markInboxNotificationRead,
  markInboxNotificationUnread,
  deleteInboxNotification,
} from "@/lib/inbox/server"
import {
  listOrgTeamsWithMembership,
  getTeam,
  updateTeamSettings,
  updateTeamEstimateSettings,
  removeTeam,
  listTeamMembersDetailed,
  addMemberToTeam,
  removeMemberFromTeam,
  listTeamJoinRequests,
  acceptTeamJoinRequest,
  declineTeamJoinRequest,
  listSidebarTeams,
} from "@/lib/teams/server"
import { updateTeamCycleSettings } from "@/lib/cycles/server"
import { listOrganizations, listMembers } from "@/lib/auth/session"
import { requireOrgMember } from "@/lib/server/access"
import { requireOrgSession } from "@/lib/server/session"

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  }
}

async function runTool<T>(fn: () => Promise<T>) {
  try {
    return jsonResult(await fn())
  } catch (err) {
    return errorResult(err)
  }
}

/** Register project-one domain tools on an MCP server instance. */
export function registerMcpTools(server: McpServer) {
  // —— Context ——
  server.registerTool(
    "session_get",
    {
      description:
        "Current MCP user and active organization (from API key + X-Organization-Id).",
    },
    async () =>
      runTool(async () => {
        const { session, organizationId } = await requireOrgSession()
        return {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          },
          organizationId,
        }
      })
  )

  server.registerTool(
    "orgs_list",
    { description: "List organizations the current user belongs to." },
    async () => runTool(() => listOrganizations())
  )

  server.registerTool(
    "org_set_active",
    {
      description:
        "Set the active organization for MCP (X-Organization-Id / API key metadata). Cookie sessions also call Better Auth setActiveOrganization.",
      inputSchema: { organizationId: z.string().min(1) },
    },
    async ({ organizationId }) =>
      runTool(async () => {
        const { headers, session } = await requireOrgSession()
        await requireOrgMember(session.user.id, organizationId)

        // API-key / MCP synthetic sessions have no durable session cookie token.
        const isMcpSession = String(session.session.id).startsWith("mcp:")
        if (isMcpSession) {
          return {
            organizationId,
            active: true,
            via: "mcp-header-or-metadata",
            hint: "Pass x-organization-id on MCP requests (already configured in Cursor).",
          }
        }

        return auth.api.setActiveOrganization({
          headers,
          body: { organizationId },
        })
      })
  )

  server.registerTool(
    "members_list",
    { description: "List members of the active organization." },
    async () => runTool(() => listMembers())
  )

  // —— Teams ——
  server.registerTool(
    "teams_list",
    { description: "List teams in the active organization (with membership)." },
    async () => runTool(() => listOrgTeamsWithMembership())
  )

  server.registerTool(
    "teams_sidebar_list",
    { description: "List teams for sidebar / cycle summaries." },
    async () => runTool(() => listSidebarTeams())
  )

  server.registerTool(
    "team_get",
    {
      description: "Get a team by id.",
      inputSchema: { teamId: z.string().min(1) },
    },
    async ({ teamId }) => runTool(() => getTeam({ data: { teamId } }))
  )

  server.registerTool(
    "team_create",
    {
      description: "Create a team in the active organization.",
      inputSchema: {
        name: z.string().min(1),
        identifier: z.string().min(2).max(4).optional(),
        description: z.string().optional(),
      },
    },
    async (args) =>
      runTool(async () => {
        const { headers, organizationId } = await requireOrgSession()
        const identifier =
          args.identifier?.trim().toUpperCase() ||
          args.name
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 4) ||
          "TEAM"
        return auth.api.createTeam({
          headers,
          body: {
            name: args.name,
            organizationId,
            identifier,
            ...(args.description ? { description: args.description } : {}),
          },
        })
      })
  )

  server.registerTool(
    "team_update_settings",
    {
      description: "Update team name/description/identifier.",
      inputSchema: {
        teamId: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        identifier: z.string().min(2).max(4).optional(),
      },
    },
    async (args) => runTool(() => updateTeamSettings({ data: args }))
  )

  server.registerTool(
    "team_update_estimates",
    {
      description: "Update team estimate settings.",
      inputSchema: {
        teamId: z.string().min(1),
        estimateType: z.enum([
          "not_in_use",
          "exponential",
          "fibonacci",
          "linear",
          "t_shirt",
        ]),
        allowZeroEstimates: z.boolean(),
        extendedEstimateScale: z.boolean(),
        countUnestimatedIssues: z.boolean(),
      },
    },
    async (args) => runTool(() => updateTeamEstimateSettings({ data: args }))
  )

  server.registerTool(
    "team_update_cycles",
    {
      description: "Update team cycle settings.",
      inputSchema: {
        teamId: z.string().min(1),
        cyclesEnabled: z.boolean(),
        cycleDurationWeeks: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
        ]),
        cycleStartDay: z.number().int().min(0).max(6),
      },
    },
    async (args) => runTool(() => updateTeamCycleSettings({ data: args }))
  )

  server.registerTool(
    "team_delete",
    {
      description: "Delete a team by id.",
      inputSchema: { teamId: z.string().min(1) },
    },
    async ({ teamId }) => runTool(() => removeTeam({ data: { teamId } }))
  )

  server.registerTool(
    "team_members_list",
    {
      description: "List members of a team.",
      inputSchema: { teamId: z.string().min(1) },
    },
    async ({ teamId }) =>
      runTool(() => listTeamMembersDetailed({ data: { teamId } }))
  )

  server.registerTool(
    "team_member_add",
    {
      description: "Add an org member to a team.",
      inputSchema: {
        teamId: z.string().min(1),
        userId: z.string().min(1),
      },
    },
    async (args) => runTool(() => addMemberToTeam({ data: args }))
  )

  server.registerTool(
    "team_member_remove",
    {
      description: "Remove a member from a team.",
      inputSchema: {
        teamId: z.string().min(1),
        userId: z.string().min(1),
      },
    },
    async (args) => runTool(() => removeMemberFromTeam({ data: args }))
  )

  server.registerTool(
    "team_join_requests_list",
    {
      description: "List pending team join requests.",
      inputSchema: { teamId: z.string().min(1) },
    },
    async ({ teamId }) =>
      runTool(() => listTeamJoinRequests({ data: { teamId } }))
  )

  server.registerTool(
    "team_join_request_accept",
    {
      description: "Accept a team join request.",
      inputSchema: {
        teamId: z.string().min(1),
        userId: z.string().min(1),
        notificationId: z.string().min(1).optional(),
      },
    },
    async (args) => runTool(() => acceptTeamJoinRequest({ data: args }))
  )

  server.registerTool(
    "team_join_request_decline",
    {
      description: "Decline a team join request.",
      inputSchema: {
        teamId: z.string().min(1),
        userId: z.string().min(1),
      },
    },
    async (args) => runTool(() => declineTeamJoinRequest({ data: args }))
  )

  // —— Projects ——
  server.registerTool(
    "projects_list",
    { description: "List projects in the active organization." },
    async () => runTool(() => listProjects())
  )

  server.registerTool(
    "project_get",
    {
      description: "Get a project by id.",
      inputSchema: { projectId: z.string().min(1) },
    },
    async ({ projectId }) => runTool(() => getProject({ data: { projectId } }))
  )

  server.registerTool(
    "project_create",
    {
      description: "Create a project.",
      inputSchema: {
        name: z.string().min(2),
        priority: z.number().int().min(0).max(4).optional(),
        /** Defaults to creation day when omitted. */
        startDate: z.string().optional(),
        /** Defaults to creation day + 14 days when omitted. */
        targetDate: z.string().optional(),
        leadId: z.string().optional(),
        teamId: z.string().optional(),
      },
    },
    async (args) =>
      runTool(() =>
        createProject({
          data: {
            name: args.name,
            priority: args.priority ?? 0,
            startDate: args.startDate,
            targetDate: args.targetDate,
            leadId: args.leadId,
            teamId: args.teamId,
          },
        })
      )
  )

  server.registerTool(
    "project_update",
    {
      description:
        "Update a project (name, status, members, teams, labels, …).",
      inputSchema: {
        projectId: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        status: z
          .enum(["backlog", "planned", "in_progress", "completed", "canceled"])
          .optional(),
        priority: z.number().int().min(0).max(4).optional(),
        leadId: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        targetDate: z.string().optional(),
        memberIds: z.array(z.string()).optional(),
        teamIds: z.array(z.string()).optional(),
        labelIds: z.array(z.string()).optional(),
      },
    },
    async (args) =>
      runTool(() =>
        updateProject({
          data: {
            ...args,
            targetDate: args.targetDate ?? undefined,
          },
        })
      )
  )

  server.registerTool(
    "project_delete",
    {
      description: "Delete a project by id.",
      inputSchema: { projectId: z.string().min(1) },
    },
    async ({ projectId }) =>
      runTool(() => deleteProject({ data: { projectId } }))
  )

  server.registerTool(
    "project_activity_list",
    {
      description: "List project activity.",
      inputSchema: { projectId: z.string().min(1) },
    },
    async ({ projectId }) =>
      runTool(() => listProjectActivity({ data: { projectId } }))
  )

  server.registerTool(
    "project_comments_list",
    {
      description: "List project comments.",
      inputSchema: { projectId: z.string().min(1) },
    },
    async ({ projectId }) =>
      runTool(() => listProjectComments({ data: { projectId } }))
  )

  server.registerTool(
    "project_comment_create",
    {
      description: "Create a project comment.",
      inputSchema: {
        projectId: z.string().min(1),
        body: z.string().min(1),
      },
    },
    async (args) => runTool(() => createProjectComment({ data: args }))
  )

  server.registerTool(
    "project_comment_delete",
    {
      description: "Delete a project comment.",
      inputSchema: {
        projectId: z.string().min(1),
        commentId: z.string().min(1),
      },
    },
    async (args) => runTool(() => deleteProjectComment({ data: args }))
  )

  server.registerTool(
    "project_documents_list",
    {
      description: "List documents linked to a project.",
      inputSchema: { projectId: z.string().min(1) },
    },
    async ({ projectId }) =>
      runTool(() => listProjectDocuments({ data: { projectId } }))
  )

  server.registerTool(
    "project_document_link",
    {
      description: "Link an existing document to a project.",
      inputSchema: {
        projectId: z.string().min(1),
        documentId: z.string().min(1),
        teamId: z.string().min(1),
      },
    },
    async (args) => runTool(() => linkDocumentToProject({ data: args }))
  )

  server.registerTool(
    "project_document_unlink",
    {
      description: "Unlink a document from a project.",
      inputSchema: {
        projectId: z.string().min(1),
        documentId: z.string().min(1),
        teamId: z.string().min(1),
      },
    },
    async (args) => runTool(() => unlinkDocumentFromProject({ data: args }))
  )

  // —— Issues ——
  server.registerTool(
    "issues_list",
    {
      description: "List issues (optional filters).",
      inputSchema: {
        teamId: z.string().optional(),
        projectId: z.string().optional(),
        mine: z.boolean().optional(),
        inCycle: z.boolean().optional(),
        statusCategory: z
          .enum([
            "triage",
            "backlog",
            "unstarted",
            "started",
            "completed",
            "canceled",
            "duplicate",
          ])
          .optional(),
        includeDescription: z.boolean().optional(),
      },
    },
    async (args) => runTool(() => listIssues({ data: args }))
  )

  server.registerTool(
    "issue_get",
    {
      description: "Get an issue by id.",
      inputSchema: { issueId: z.string().min(1) },
    },
    async ({ issueId }) => runTool(() => getIssue({ data: { issueId } }))
  )

  server.registerTool(
    "issue_create",
    {
      description: "Create an issue.",
      inputSchema: {
        title: z.string().min(2),
        teamId: z.string().min(1),
        projectId: z.string().optional(),
        statusId: z.string().optional(),
        priority: z.number().int().min(0).max(4).optional(),
        description: z.string().optional(),
      },
    },
    async (args) => runTool(() => createIssue({ data: args }))
  )

  server.registerTool(
    "issue_update",
    {
      description: "Update an issue.",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(200_000).nullable().optional(),
        priority: z.number().int().min(0).max(4).optional(),
        estimatedHours: z.number().int().min(0).max(1000).nullable().optional(),
        statusId: z.string().min(1).nullable().optional(),
        assigneeId: z.string().min(1).nullable().optional(),
        projectId: z.string().min(1).nullable().optional(),
        labelIds: z.array(z.string().min(1)).optional(),
        cycleNumber: z.number().int().min(1).nullable().optional(),
      },
    },
    async (args) => runTool(() => updateIssue({ data: args }))
  )

  server.registerTool(
    "issue_delete",
    {
      description: "Delete an issue.",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
      },
    },
    async (args) => runTool(() => deleteIssue({ data: args }))
  )

  server.registerTool(
    "issue_comments_list",
    {
      description: "List comments on an issue.",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
      },
    },
    async (args) => runTool(() => listIssueComments({ data: args }))
  )

  server.registerTool(
    "issue_comment_create",
    {
      description: "Create an issue comment.",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
        body: z.string().min(1),
        parentId: z.string().nullable().optional(),
      },
    },
    async (args) => runTool(() => createIssueComment({ data: args }))
  )

  server.registerTool(
    "issue_comment_delete",
    {
      description: "Delete an issue comment.",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
        commentId: z.string().min(1),
      },
    },
    async (args) => runTool(() => deleteIssueComment({ data: args }))
  )

  server.registerTool(
    "issue_timeline_get",
    {
      description: "Get issue timeline (activity + comments).",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
      },
    },
    async (args) => runTool(() => getIssueTimeline({ data: args }))
  )

  server.registerTool(
    "issue_subscription_set",
    {
      description: "Subscribe or unsubscribe the current user to an issue.",
      inputSchema: {
        teamId: z.string().min(1),
        issueId: z.string().min(1),
        subscribe: z.boolean(),
      },
    },
    async (args) => runTool(() => setIssueSubscription({ data: args }))
  )

  // —— Labels ——
  server.registerTool(
    "labels_list",
    { description: "List organization labels." },
    async () => runTool(() => listLabels())
  )

  server.registerTool(
    "label_get",
    {
      description: "Get a label by id.",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => runTool(() => getLabel({ data: { id } }))
  )

  server.registerTool(
    "label_create",
    {
      description: "Create a label.",
      inputSchema: { name: z.string().min(1).max(64) },
    },
    async ({ name }) => runTool(() => createLabel({ data: { name } }))
  )

  server.registerTool(
    "label_update",
    {
      description: "Rename a label.",
      inputSchema: {
        id: z.string().min(1),
        name: z.string().min(1).max(64),
      },
    },
    async (args) => runTool(() => updateLabel({ data: args }))
  )

  server.registerTool(
    "label_delete",
    {
      description: "Delete a label.",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => runTool(() => deleteLabel({ data: { id } }))
  )

  // —— Statuses ——
  server.registerTool(
    "statuses_list",
    {
      description: "List issue statuses for a team.",
      inputSchema: { teamId: z.string().min(1) },
    },
    async ({ teamId }) => runTool(() => listStatuses({ data: { teamId } }))
  )

  server.registerTool(
    "status_get",
    {
      description: "Get a status by id.",
      inputSchema: {
        id: z.string().min(1),
        teamId: z.string().min(1),
      },
    },
    async (args) => runTool(() => getStatus({ data: args }))
  )

  server.registerTool(
    "status_create",
    {
      description: "Create a team issue status (not triage/duplicate).",
      inputSchema: {
        teamId: z.string().min(1),
        name: z.string().min(1),
        category: z.enum([
          "backlog",
          "unstarted",
          "started",
          "completed",
          "canceled",
        ]),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
      },
    },
    async (args) => runTool(() => createStatus({ data: args }))
  )

  server.registerTool(
    "status_update",
    {
      description: "Update a team issue status.",
      inputSchema: {
        id: z.string().min(1),
        teamId: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        category: z
          .enum([
            "triage",
            "backlog",
            "unstarted",
            "started",
            "completed",
            "canceled",
            "duplicate",
          ])
          .optional(),
        isDefault: z.boolean().optional(),
      },
    },
    async (args) => runTool(() => updateStatus({ data: args }))
  )

  server.registerTool(
    "status_delete",
    {
      description: "Delete a team issue status.",
      inputSchema: {
        id: z.string().min(1),
        teamId: z.string().min(1),
      },
    },
    async (args) => runTool(() => deleteStatus({ data: args }))
  )

  // —— Documents ——
  server.registerTool(
    "documents_list",
    {
      description: "List documents for a team.",
      inputSchema: { teamId: z.string().min(1) },
    },
    async ({ teamId }) => runTool(() => listTeamDocuments({ data: { teamId } }))
  )

  server.registerTool(
    "document_get",
    {
      description: "Get a document by id.",
      inputSchema: {
        teamId: z.string().min(1),
        documentId: z.string().min(1),
      },
    },
    async (args) => runTool(() => getTeamDocument({ data: args }))
  )

  server.registerTool(
    "document_create",
    {
      description: "Create a team document.",
      inputSchema: {
        teamId: z.string().min(1),
        title: z.string().min(1),
        content: z.string().optional(),
        projectId: z.string().nullable().optional(),
        issueId: z.string().nullable().optional(),
      },
    },
    async (args) => runTool(() => createTeamDocument({ data: args }))
  )

  server.registerTool(
    "document_update",
    {
      description: "Update a document.",
      inputSchema: {
        teamId: z.string().min(1),
        documentId: z.string().min(1),
        title: z.string().min(1).optional(),
        content: z.string().nullable().optional(),
        projectId: z.string().nullable().optional(),
        issueId: z.string().nullable().optional(),
      },
    },
    async (args) => runTool(() => updateTeamDocument({ data: args }))
  )

  server.registerTool(
    "document_delete",
    {
      description: "Delete a document.",
      inputSchema: {
        teamId: z.string().min(1),
        documentId: z.string().min(1),
      },
    },
    async (args) => runTool(() => deleteTeamDocument({ data: args }))
  )

  // —— Inbox ——
  server.registerTool(
    "inbox_list",
    { description: "List inbox notifications for the current user." },
    async () => runTool(() => listInboxNotifications())
  )

  server.registerTool(
    "inbox_mark_read",
    {
      description: "Mark an inbox notification as read.",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => runTool(() => markInboxNotificationRead({ data: { id } }))
  )

  server.registerTool(
    "inbox_mark_unread",
    {
      description: "Mark an inbox notification as unread.",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) =>
      runTool(() => markInboxNotificationUnread({ data: { id } }))
  )

  server.registerTool(
    "inbox_delete",
    {
      description: "Delete an inbox notification.",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => runTool(() => deleteInboxNotification({ data: { id } }))
  )
}
