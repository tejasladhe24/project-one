# @workspace/ui

Shared design system for Project One — shadcn/ui components on Base UI, Tailwind v4 styles, and small utilities.

Package name: `@workspace/ui`

## What lives here

| Path / export | Purpose |
|---------------|---------|
| `src/components/` → `@workspace/ui/components/*` | Buttons, forms, sidebar, command, dialogs, … |
| `src/hooks/` → `@workspace/ui/hooks/*` | Shared React hooks |
| `src/lib/` → `@workspace/ui/lib/*` | Helpers (e.g. `cn`) |
| `src/styles/globals.css` → `@workspace/ui/globals.css` | Design tokens + base styles |

Apps should put **product screens** in `apps/web`; keep this package to reusable primitives and patterns.

## Usage

```tsx
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import "@workspace/ui/globals.css"
```

Workspace dependency (already wired in `apps/web`):

```json
"@workspace/ui": "workspace:*"
```

## Adding components

From the **monorepo root**, target the web app’s `components.json` (aliases point UI into this package):

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Config reference: [`apps/web/components.json`](../../apps/web/components.json) (style `base-nova`, CSS in this package’s `globals.css`).

## Scripts

```bash
pnpm --filter @workspace/ui lint
pnpm --filter @workspace/ui typecheck
pnpm --filter @workspace/ui format
```

There is no standalone `dev` server; develop through `apps/web`.

## Stack

- React 19
- Tailwind CSS v4
- Base UI (`@base-ui/react`)
- shadcn CLI / registry patterns
- `class-variance-authority`, `cmdk`, `sonner`, `vaul`, etc.

See [`TECH-STACK.md`](../../TECH-STACK.md).
