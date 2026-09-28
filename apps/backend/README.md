# backend

Minimal FastAPI template for Project One. No product logic yet — scaffold only.

Package name: `backend`  
Default port: `8000`

## Layout

| Path | Purpose |
|------|---------|
| `src/backend/app.py` | FastAPI app + `/health` |
| `src/backend/__main__.py` | `python -m backend` entry (Uvicorn) |
| `pyproject.toml` | Hatchling project + dependencies |

## Prerequisites

- Python ≥ 3.11

## Setup & run

```bash
cd apps/backend

# Example with uv
uv sync
uv run uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

# Or module entry (no reload)
uv run python -m backend
```

With plain pip:

```bash
pip install -e .
uvicorn backend.app:app --reload --port 8000
```

Health: [http://localhost:8000/health](http://localhost:8000/health)

## Stack

- FastAPI
- Uvicorn

See [`TECH-STACK.md`](../../TECH-STACK.md) and root [`README.md`](../../README.md).
