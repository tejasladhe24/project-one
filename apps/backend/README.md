# backend

Python FastAPI service for Project One — health checks, game-theory / simulation REST endpoints, and an MCP SSE mount.

Package name: `backend`  
Default port: `8000`

## What lives here

| Path | Purpose |
|------|---------|
| `src/backend/app.py` | FastAPI app, CORS, routes |
| `src/backend/models.py` | Pydantic request/response models |
| `src/backend/__main__.py` | `python -m backend` entry (Uvicorn) |
| `pyproject.toml` | Hatchling project + dependencies |

This service is a **sidecar** relative to `apps/web`. It does not own the product Postgres schema.

## Capabilities (current)

- `GET /health` — liveness
- Payoff evaluation, Monte Carlo sampling, and Nash-related payloads (see `models.py`)
- MCP integration (`mcp` dependency) for tool exposure alongside REST mirrors

Stack: FastAPI, Uvicorn, Pydantic, NumPy, SciPy, Polars, MCP.

## Prerequisites

- Python ≥ 3.11
- A virtualenv tooling of your choice (`uv`, `pip`, `hatch`, etc.)

## Setup & run

```bash
cd apps/backend

# Example with uv
uv sync
uv run uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

# Or module entry (no reload)
uv run python -m backend
```

With plain pip + hatchling:

```bash
pip install -e .
uvicorn backend.app:app --reload --port 8000
```

Health: [http://localhost:8000/health](http://localhost:8000/health)

## Notes

- CORS is currently open (`allow_origins=["*"]`) for local development.
- Wire this service into the web app only when product features need these compute/MCP tools.

See [`TECH-STACK.md`](../../TECH-STACK.md) and root [`README.md`](../../README.md).
