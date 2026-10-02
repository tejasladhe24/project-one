---
name: create-linear-ticket
description: >-
  Create Linear issues with a fixed markdown template (Summary, Environment,
  Bug/Feature, How to Reproduce, Acceptance Criteria, Extra Notes). Assigns to
  the logged-in user, links Project One, and sets priority/estimate from
  preferences. Use when the user asks to create a Linear ticket, file a bug,
  open a feature request, or log work in Linear.
---

# Create Linear Ticket

Create Linear issues with a consistent description body. Prefer the Linear MCP
`save_issue` tool (`plugin-linear-linear`). Do not invent fields outside the
template.

## When to use

- User asks to create / file / open a Linear ticket, bug, or feature
- User wants work logged from conversation context into Linear

## Preferences

**Always read** [preferences.json](preferences.json) before creating an issue.
Those values are the defaults for this repo. User overrides in the chat win.

| Preference | Purpose |
|------------|---------|
| `team` | Linear team name |
| `state` | Initial status (`Todo` or `Triage` when available) |
| `assignee` | Who owns the ticket (`"me"` = logged-in Linear user) |
| `project` / `projectId` | Project to attach (this repo → **Project One**) |
| `priority` | Default / bug / feature priority (1=Urgent … 4=Low) |
| `estimate` | Default points (1 point = 1 hour) + complexity guidance |
| `labels` | Bug vs Feature label sets |
| `environmentDefault` | Fallback for Which Environment? |

If `state` is `Triage` but the team has no Triage status, fall back to `Todo`.

## Workflow

1. Read [preferences.json](preferences.json).
2. Infer or ask for: short title, environment, type (bug vs feature), reproduction steps, acceptance criteria.
3. Resolve fields from preferences (unless the user overrides):
   - **team** → `preferences.team`
   - **assignee** → `preferences.assignee` (`"me"`)
   - **project** → `preferences.project` (`Project One`)
   - **state** → `preferences.state`
   - **labels** → Bug or Feature from `preferences.labels`
   - **priority** → pick from preferences + guidance below
   - **estimate** → pick from preferences + guidance below
4. Build the description from the template below (exact section headings).
5. Call `save_issue` with all resolved fields.
6. Return the issue identifier and URL. Do not push code or open PRs unless asked.

### Priority

Use `preferences.priority` defaults, then adjust from context:

| Value | Name | When |
|-------|------|------|
| 1 | Urgent | Blocking / production incident / unblocks others now |
| 2 | High | Important soon; bugs that hurt core flows |
| 3 | Medium | Normal planned work (default for features) |
| 4 | Low | Nice-to-have, polish, non-blocking |
| 0 | None | Only if the user asks for no priority |

Defaults: bugs → `priority.bug` (High), features → `priority.feature` (Medium).

### Estimate

Always set an estimate using `preferences.estimate.allowed` (exponential: 1, 2, 4, 8, 16, 32, 64).
**1 point = 1 hour** of effective effort (AI-assisted). Size by complexity, not calendar days.

| Points | Hours | Complexity |
|--------|-------|------------|
| 1 | ~1h | Trivial — single obvious change |
| 2 | ~2h | Simple — localized, clear path |
| 4 | ~4h | Moderate — a few files or a small flow |
| 8 | ~8h | Substantial — multi-surface or non-trivial logic |
| 16 | ~16h | Complex — interconnected pieces / tricky edges |
| 32 | ~32h | Heavy — broad refactor or deep investigation; prefer splitting |
| 64 | ~64h | Epic — many unknowns / cross-cutting; almost always split |

If scope is unclear, use `estimate.default` and note uncertainty only if the user asks; do not put sizing debate in Extra Notes.

### Environment values

Use exactly one of: `dev`, `product`, `rc`, `main`.
If unclear, use `preferences.environmentDefault`.

### Missing info

If reproduction steps or acceptance criteria are unknown, ask briefly. Do not
create the ticket with placeholder fluff like "TBD" in those sections unless
the user explicitly allows it.

## Description template

Use these section headings **verbatim** and in this order:

```markdown
## Summary

<one line only>

## Which Environment?

`<dev | product | rc | main>`

## Bug / Feature

<elaborated description of the subject — what is wrong or what should be built>

## How to Reproduce?

1. ...
2. ...
3. ...

## Acceptance Criteria

1. ...
2. ...
3. ...

## Extra Notes

```

### Section rules

1. **Summary** — Exactly one sentence/line. No bullets. Captures the outcome or problem in plain language.
2. **Which Environment?** — Single value from `dev`, `product`, `rc`, `main`. Prefer inline code (e.g. `` `dev` ``).
3. **Bug / Feature** — Longer description of the subject. For bugs: expected vs actual and impact. For features: problem, desired behavior, and why it matters.
4. **How to Reproduce?** — Numbered list only. For bugs: concrete steps to hit the issue. For features: numbered steps that show the current gap or the flow to validate after shipping.
5. **Acceptance Criteria** — Numbered list only. Testable, binary checks for done.
6. **Extra Notes** — Always include the heading. Leave the body empty so humans can fill it in later. Do not invent notes.

### Title

- Short, actionable, no trailing period
- Prefer imperative or problem-focused phrasing
- Examples: `Fix inbox redirect loop on empty state`, `Add OG image to public auth pages`

### Labels

- Bug ticket → `labels` from `preferences.labels.bug`
- Feature ticket → `labels` from `preferences.labels.feature`
- Do not add other labels unless the user asks

## Example (bug)

**Title:** `Center error details trigger on global error page`

**Fields:** `assignee: me`, `project: Project One`, `state: Todo`, `priority: 2`, `estimate: 2`, `labels: ["Bug"]`

**Description:**

```markdown
## Summary

The Error details disclosure on the global error page is left-aligned and looks out of place.

## Which Environment?

`dev`

## Bug / Feature

On the global error boundary, icon, title, description, and actions are centered, but the Error details collapsible trigger sits left of center because of default disclosure marker / text alignment. This makes the status page look unbalanced.

## How to Reproduce?

1. Force a route error so `GlobalErrorBoundary` renders.
2. View the page on a wide viewport.
3. Compare horizontal alignment of the Error details trigger vs the buttons above it.

## Acceptance Criteria

1. Error details trigger is horizontally centered with the rest of the empty-state content.
2. Expanded error details remain readable (left-aligned monospace block is OK).
3. Layout still centers correctly with and without the app header.

## Extra Notes

```

## Example (feature)

**Title:** `Add default OG image for public auth pages`

**Fields:** `assignee: me`, `project: Project One`, `state: Todo`, `priority: 3`, `estimate: 4`, `labels: ["Feature"]`

**Description:**

```markdown
## Summary

Public auth pages need a default Open Graph image for link previews.

## Which Environment?

`product`

## Bug / Feature

Sign-in and sign-up pages currently emit title/description OG tags but no `og:image` or `twitter:image`. Shared links show text-only previews. Add a default share image and wire it through `pageMeta` / root head for public routes.

## How to Reproduce?

1. Open `/sign-in` in a deployed environment.
2. Inspect document head for `og:image` / `twitter:image`.
3. Paste the URL into a link-preview debugger (Slack/iMessage/opengraph.xyz).

## Acceptance Criteria

1. A default OG image asset is committed under the web public assets.
2. Public auth routes (and root defaults) include absolute `og:image` and `twitter:image`.
3. Twitter card type is appropriate for the image (`summary` or `summary_large_image`).

## Extra Notes

```

## Linear MCP call shape

```text
save_issue
  team: <preferences.team>
  title: <title>
  description: <template markdown with literal newlines>
  labels: ["Bug"] | ["Feature"]
  assignee: me
  project: Project One
  state: Todo
  priority: <1|2|3|4>
  estimate: <1|2|4|8|16|32|64>
```

`assignee: "me"` resolves to the logged-in Linear user. Always pass it unless the
user names someone else. Always pass `project` for tickets from this repo.

After create, reply with the issue id and url only (plus a one-line confirmation).
