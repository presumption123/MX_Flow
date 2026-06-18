"""FastAPI application — static files and coach API."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from server.coach import call_coach

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"

app = FastAPI(title="MX Flow", version="1.0.0")


class CoachRequest(BaseModel):
    round: dict
    message: str
    messages: list[dict] | None = None
    context: dict | None = None


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "coach": bool(os.environ.get("ANTHROPIC_API_KEY")),
    }


@app.post("/api/coach")
async def coach_endpoint(body: CoachRequest):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="Coach unavailable — set ANTHROPIC_API_KEY on server")
    try:
        result = await call_coach(body.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


if STATIC.exists():
    app.mount("/", StaticFiles(directory=str(STATIC), html=True), name="static")
