# web

TanStack Start application for Project One — auth, organizations, teams, projects, issues, cycles, documents, and inbox.

Package name: `web`  
App URL (local): [http://localhost:3000](http://localhost:3000)

## What lives here

| Path | Purpose |
|------|---------|
| `src/routes/` | File-based TanStack Router routes |
| `src/components/` | App UI (issue, project, team, auth, …) |
| `src/lib/` | Server functions + domain logic |
| `src/db/` | Drizzle schema and client |
| `drizzle/` | SQL migrations |
| `src/email/` | React Email templates |

Shared UI comes from [`@workspace/ui`](../../packages/ui).

## Prerequisites

From the monorepo root:

1. `pnpm install`
2. `docker compose up -d` (Postgres + Redis)
3. Root `.env` configured (see [`.env.example`](../../.env.example) and `src/env.ts`)

Key env vars used by this app (via `src/env.ts`):

- `POSTGRES_URL`, `REDIS_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_DOMAIN`, `APP_URL`, `VITE_APP_URL`
- `RESEND_API_KEY`, `EMAIL_SENDER_NAME`, `EMAIL_SENDER_ADDRESS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (OAuth)

## Scripts

Run from repo root with the filter, or from this directory:

```bash
# Dev (Vite on :3000)
pnpm --filter web dev

# Production build / preview
pnpm --filter web build
pnpm --filter web preview

pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web format

# Database
pnpm --filter web db:generate   # drizzle-kit generate → drizzle/
pnpm --filter web db:push       # push schema to Postgres
pnpm --filter web db:studio     # Drizzle Studio

# Better Auth schema helper
pnpm --filter web auth:generate
```

Root shortcut: `pnpm db:push` → `pnpm --filter web db:push`.

## Adding shadcn components

Components are installed into `packages/ui`. From repo root:

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Stack (this app)

- TanStack Start / Router / Form / Table
- React 19, Vite 8, Tailwind v4
- Better Auth (organization plugin)
- Drizzle ORM + PostgreSQL
- Redis, Resend, Zod

See [`TECH-STACK.md`](../../TECH-STACK.md) and [`PRODUCT.md`](../../PRODUCT.md).
