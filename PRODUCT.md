# Product

Project One is a multi-tenant, Linear-inspired work tracker for product and engineering teams. Users belong to an **organization**, collaborate in **teams**, plan work with **projects** and **cycles**, and track execution through **issues**, comments, and an **inbox**.

## Who it’s for

Small-to-mid product/engineering orgs that want:

- Team-scoped issue workflows (statuses, labels, estimates)
- Project-level planning (status, lead, members, dates, linked teams)
- Lightweight collaboration (comments with `@` mentions, activity history, notifications)

## Core concepts

| Concept | Description |
|---------|-------------|
| **Organization** | Tenant boundary. Auth, members, invitations, and shared labels live here. |
| **Team** | Engineering unit with identifier (e.g. `ENGG`), members, statuses, cycles, documents, and issues. |
| **Project** | Cross-cutting initiative: lead, members, status/priority, dates, teams, labels, resources, and activity. |
| **Issue** | Work item owned by a team (`TEAM-0001`), optionally linked to a project and cycle. |
| **Cycle** | Time-boxed period derived from team schedule settings (origin + duration), not a separate cycle table. |
| **Document** | Team-owned notes; may link to a project or issue. |
| **Inbox** | Per-user notifications for issue/activity events (comments, mentions, assignments, etc.). |

## Feature map

### Auth & workspace

- Email/password sign-up and sign-in (Better Auth)
- Optional Google OAuth
- Email verification / password reset / org invitations (Resend templates)
- Active organization selection; invite members by email
- Org members directory

### Teams

- Create and list teams; join / membership settings
- General settings (name, identifier)
- Custom issue statuses by workflow category (triage → completed)
- Org-scoped labels
- Estimate scale configuration
- Cycle settings (enable, origin date, duration)
- Team home, triage queue, projects, documents, cycles views

### Issues

- Create and list issues (org-wide and team-scoped)
- Metadata: status, priority, assignee, project, labels, estimate, due date, cycle
- Description (markdown)
- Comments with replies and `@` user / issue mentions
- Activity timeline (created, field changes, comments) with collapse for noisy bursts
- Subscribe / unsubscribe; inbox notifications for subscribers and mentions
- Grouped tables (e.g. by status, team, or cycle)

### Projects

- Create projects with lead, priority, target date, optional team
- Overview: description, linked documents/resources
- Properties: status, priority, lead, members, dates, teams, labels
- Issues filtered to the project
- Activity: property-change log + threaded comments with `@` mentions (same interaction model as issues)

### Documents

- Team document list and editor
- Optional links to projects / issues

### Inbox

- Notification list for the signed-in user
- Priority signals for high-signal events (e.g. mentions)

## Product principles (current UI)

- Fast metadata editing via pills / menus (status, priority, assignee, etc.)
- Activity and comments co-located on issue and project surfaces
- Shared table patterns for issues across my issues, team, project, and cycle views
- Sidebar navigation for workspace, teams, and secondary actions

## Out of scope (today)

Not implemented as first-class product features yet (may exist only as stubs or libs):

- Public issue sharing / guest access
- Time tracking / billing
- Native mobile apps
- Full AI agent product surface (AI SDK is present for future use)
- Product features on the Python FastAPI backend (template only today)

## Related docs

- [`README.md`](README.md) — setup and monorepo map
- [`TECH-STACK.md`](TECH-STACK.md) — implementation stack
