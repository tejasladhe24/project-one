# Tech stack

## Overview

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Web app | TanStack Start (Vite) + React 19 |
| UI kit | shadcn/ui on Base UI → `@workspace/ui` |
| Auth | Better Auth (organization plugin) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / sessions helpers | Redis 7 |
| Email | Resend + React Email |
| Validation | Zod |
| Python service | FastAPI + Uvicorn (+ MCP) |
| Local infra | Docker Compose |

## Monorepo tooling

- **Package manager:** pnpm (`packageManager` pinned in root `package.json`)
- **Task runner:** Turborepo (`dev`, `build`, `lint`, `typecheck`, `format`)
- **Language (JS/TS):** TypeScript 6
- **Formatting:** Prettier + `prettier-plugin-tailwindcss`
- **Linting:** ESLint via `@tanstack/eslint-config`

## `apps/web` — product application

### Runtime & framework

- **React 19** + **React DOM**
- **TanStack Start** — full-stack React framework (SSR, server functions)
- **TanStack Router** — file-based routes under `apps/web/src/routes`
- **Vite 8** — bundler / dev server (port `3000`)
- **TanStack Form** — forms
- **TanStack Table** — data tables

### UI

- **`@workspace/ui`** — shared components (Button, Command, Avatar, Sidebar, etc.)
- **Tailwind CSS v4** + `@tailwindcss/vite`
- **Base UI** (`@base-ui/react`) — headless primitives behind shadcn wrappers
- **Icons:** `@tabler/icons-react`, `lucide-react`
- **Themes:** `next-themes`
- **Toasts:** `sonner`
- **DnD:** `@dnd-kit/*`
- **Charts:** `recharts`
- **Markdown:** `react-markdown` + `remark-gfm`

### Data & auth

- **PostgreSQL** via `pg`
- **Drizzle ORM** + **drizzle-kit** (schema in `apps/web/src/db`, SQL in `apps/web/drizzle`)
- **Better Auth** + `@better-auth/drizzle-adapter`
  - Organization plugin (orgs, members, invitations, teams integration)
- **Redis** via `ioredis`
- **Zod** for server-fn validators and env
- **`@t3-oss/env-core`** for typed environment

### Server patterns

- TanStack **server functions** (`createServerFn`) under `apps/web/src/lib/**`
- Client mutations wrapped by `useServerMutation` (toast + optional `router.invalidate`)
- Access helpers: org session, team/issue/project membership checks

### Email & other

- **Resend** for transactional mail
- **`@react-email/components`** for templates (invite, verify, reset)
- **AI SDK** (`ai`, `@ai-sdk/openai`) available for future agent/features
- **nanoid** / **uuid** for IDs

## `packages/ui` — design system

- Consumed as `@workspace/ui`
- Exports: `./components/*`, `./hooks/*`, `./lib/*`, `./globals.css`
- Built around shadcn + Tailwind; app-specific screens stay in `apps/web`

## `apps/backend` — Python service

- **Python ≥ 3.11**, Hatchling packaging
- **FastAPI** + **Uvicorn**
- **Pydantic** models
- **MCP** server mount alongside REST mirrors
- Scientific stack present: **NumPy**, **SciPy**, **Polars** (analysis / simulation endpoints)

Independent of the web app’s Drizzle schema; treat as a sidecar for compute / MCP tools.

## Infrastructure (local)

[`docker-compose.yml`](docker-compose.yml):

| Service | Image | Host port |
|---------|-------|-----------|
| Postgres | `postgres:16-alpine` | `54325` → `5432` |
| Redis | `redis:7-alpine` | `63799` → `6379` |

Default DB name: `project_one`. Env templates live in [`.env.example`](.env.example).

## Notable directories

```
apps/web/src/
  components/     # App UI (issue, project, team, auth, …)
  db/schema/      # Drizzle tables (auth + domain)
  lib/            # Server fns + domain logic (issues, projects, cycles, …)
  routes/         # TanStack file routes
  email/          # React Email templates
packages/ui/src/
  components/     # Shared primitives
  styles/         # Global CSS / design tokens
apps/backend/src/backend/
  app.py          # FastAPI entry
```

## Related docs

- [`README.md`](README.md) — install and run
- [`PRODUCT.md`](PRODUCT.md) — product behavior
