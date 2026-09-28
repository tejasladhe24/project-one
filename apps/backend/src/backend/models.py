"""Pydantic v2 payloads for the simulation math engine."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class PayoffMatrix(BaseModel):
    """2-player payoff tensors.

    `payoffs_row` / `payoffs_col` are n_row_actions × n_col_actions matrices.
    """

    row_actions: list[str] = Field(min_length=1)
    col_actions: list[str] = Field(min_length=1)
    payoffs_row: list[list[float]]
    payoffs_col: list[list[float]]

    @field_validator("payoffs_row", "payoffs_col")
    @classmethod
    def _non_empty(cls, value: list[list[float]]) -> list[list[float]]:
        if not value or not value[0]:
            raise ValueError("payoff matrix must be non-empty")
        return value


class EvaluatePayoffsRequest(BaseModel):
    matrix: PayoffMatrix
    row_action: str
    col_action: str


class EvaluatePayoffsResponse(BaseModel):
    row_action: str
    col_action: str
    utility_row: float
    utility_col: float


class MonteCarloRequest(BaseModel):
    matrix: PayoffMatrix
    row_mixed: list[float] | None = None
    col_mixed: list[float] | None = None
    iterations: int = Field(default=1000, ge=1, le=100_000)
    seed: int | None = None


class MonteCarloResponse(BaseModel):
    iterations: int
    mean_utility_row: float
    mean_utility_col: float
    std_utility_row: float
    std_utility_col: float
    action_frequencies_row: dict[str, float]
    action_frequencies_col: dict[str, float]
    samples_preview: list[dict[str, Any]] = Field(default_factory=list)


class NashRequest(BaseModel):
    matrix: PayoffMatrix


class NashEquilibrium(BaseModel):
    row_action: str
    col_action: str
    utility_row: float
    utility_col: float


class NashResponse(BaseModel):
    equilibria: list[NashEquilibrium]
    count: int
