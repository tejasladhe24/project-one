"""FastAPI entry: health, REST tool mirrors, and MCP SSE mount."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    EvaluatePayoffsRequest,
    EvaluatePayoffsResponse,
    MonteCarloRequest,
    MonteCarloResponse,
    NashRequest,
    NashResponse,
)

app = FastAPI(title="Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}