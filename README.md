# Project One

Linear-style issue tracking monorepo: organizations, teams, projects, issues, cycles, documents, and inbox — with a shared UI package and a minimal FastAPI backend template.

## Monorepo layout

| Path | Package | Role |
|------|---------|------|
| [`apps/web`](apps/web) | `web` | TanStack Start app (auth, product UI, Drizzle, server functions) — [README](apps/web/README.md) |
| [`apps/backend`](apps/backend) | `backend` | Minimal FastAPI template — [README](apps/backend/README.md) |
| [`packages/ui`](packages/ui) | `@workspace/ui` | Shared shadcn/ui components, styles, and utilities — [README](packages/ui/README.md) |

## Docs

- [`PRODUCT.md`](PRODUCT.md) — product scope and feature map
- [`TECH-STACK.md`](TECH-STACK.md) — languages, frameworks, and infra

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 10.x (see `packageManager` in root `package.json`)
- Docker (Postgres + Redis via Compose)
- Python ≥ 3.11 (only if you run `apps/backend`)

## Quick start

```bash
# Install JS workspace deps
pnpm install

# Start Postgres + Redis
docker compose up -d

# Copy env and fill secrets
cp .env.example .env

# Push DB schema
pnpm db:push

# Run the web app (and other turbo `dev` tasks)
pnpm dev
```

Web app: [http://localhost:3000](http://localhost:3000)

### Environment

See [`.env.example`](.env.example). Required for local web:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (Compose maps `54325`) |
| `REDIS_URL` | Redis connection (Compose maps `63799`) |
| `BETTER_AUTH_SECRET` | Auth secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` / `VITE_APP_URL` | App origin (`http://localhost:3000`) |

Optional: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google OAuth, Resend keys for email.

## Common commands

```bash
pnpm dev          # turbo: run all package `dev` scripts
pnpm build        # turbo: production builds
pnpm lint         # turbo: lint
pnpm typecheck    # turbo: TypeScript checks
pnpm format       # prettier across the workspace
pnpm db:push      # drizzle-kit push (web)
```

### Web-only

```bash
pnpm --filter web db:generate   # create SQL migrations
pnpm --filter web db:studio     # Drizzle Studio
pnpm --filter web auth:generate # regenerate Better Auth schema helpers
```

### UI components

Add shadcn components into the shared package from the web app context:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Import from `@workspace/ui`:

```tsx
import { Button } from "@workspace/ui/components/button"
```

### Backend (Python)

```bash
cd apps/backend
# with uv / pip / hatch as you prefer
uvicorn backend.app:app --reload
```

## License

Private — all rights reserved.
