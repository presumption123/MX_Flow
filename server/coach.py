"""AI coach proxy with context truncation."""

from __future__ import annotations

import os
from typing import Any

import anthropic

from server.models import RoundDocument, migrate_round_document

SYSTEM_PROMPT = (
    "You are an expert policy debate coach. You have full context of the current round's flow — "
    "a set of flow sheets, each representing one advantage or off-case position, showing every "
    "argument made in each speech (1AC, 1NC, 2AC, Block/2NC+1NR, 1AR, 2NR, 2AR). You also have "
    "access to evidence cards uploaded by the debater. When asked to generate a response to an "
    "argument, be specific, technical, and concise — as if you are coaching a debater in real time "
    "during a round. Reference specific cards and flow positions when relevant. Format responses as "
    "flowing bullet points a debater could read quickly.\n\n"
    "Keep the first response quick and not too in-depth — the debater can ask for more explanation "
    "after seeing the brief version. Order your answers by effectiveness: lead with the single most "
    "strategic/effective response, then list the rest in descending order of strength.\n\n"
    "You will be told whether the debater is AFF or NEG. Use that to determine which uploaded speech "
    "files are OURS and which are the OPPONENT's, so you coach from the debater's perspective.\n\n"
    "Highlighting rule — applies STRICTLY ONLY to OUR OWN speeches/cards: only the highlighted portion "
    "of our cards (text wrapped in ⟦HL⟧...⟦/HL⟧) is the warrant we can explicitly reference and read "
    "in-round. For the OPPONENT's speeches, treat their card text holistically.\n\n"
    "Do evidence comparison wherever it helps win the argument."
)

MAX_ROWS_PER_SHEET = 40
MAX_CARD_CHARS = 8000
MAX_TOTAL_CONTEXT = 90000


def truncate_context(side: str, flows: str, files: str) -> tuple[str, bool]:
    truncated = False
    if len(flows) > MAX_TOTAL_CONTEXT // 2:
        flows = flows[: MAX_TOTAL_CONTEXT // 2] + "\n...(flow truncated)"
        truncated = True
    if len(files) > MAX_TOTAL_CONTEXT // 2:
        files = files[: MAX_TOTAL_CONTEXT // 2] + "\n...(cards truncated)"
        truncated = True
    return side + flows + files, truncated


def build_flows_text(round_doc: RoundDocument) -> str:
    parts: list[str] = []
    for partner in round_doc.partners:
        for sheet in partner.sheets:
            header = f'[{partner.name} — {sheet.name}]'
            lines: list[str] = []
            rows = sheet.rows[-MAX_ROWS_PER_SHEET:]
            if len(sheet.rows) > MAX_ROWS_PER_SHEET:
                lines.append(f"  (showing last {MAX_ROWS_PER_SHEET} rows)")
            for ri, row in enumerate(rows, 1):
                row_parts: list[str] = []
                for col in sheet.cols:
                    cell = row.cells.get(col)
                    if cell and cell.text.strip():
                        tag = ""
                        if cell.mark == "dropped":
                            tag = " (DROPPED)"
                        elif cell.mark == "conceded":
                            tag = " (CONCEDED)"
                        row_parts.append(f"{col}: {cell.text.strip()}{tag}")
                if row_parts:
                    lines.append(f"  Row {ri} | " + "  |  ".join(row_parts))
            parts.append(header + ("\n" + "\n".join(lines) if lines else "\n  (empty)"))
    return "\n\n=== CURRENT ROUND FLOW ===\n" + ("\n\n".join(parts) if parts else "(No flows)")


def build_files_text(round_doc: RoundDocument) -> str:
    if not round_doc.uploaded_files:
        return ""
    ours = [f for f in round_doc.uploaded_files if f.owner == "ours"]
    opp = [f for f in round_doc.uploaded_files if f.owner == "opponent"]

    def fmt(files: list) -> str:
        chunks = []
        for f in files:
            content = f.content[:MAX_CARD_CHARS]
            if len(f.content) > MAX_CARD_CHARS:
                content += "\n...(truncated)"
            chunks.append(f"\n--- FILE: {f.name} ---\n{content}")
        return "".join(chunks)

    return (
        "\n\n=== UPLOADED EVIDENCE CARDS ==="
        + "\n\n>>> OUR CARDS <<<"
        + (fmt(ours) if ours else "\n(none)")
        + "\n\n>>> OPPONENT CARDS <<<"
        + (fmt(opp) if opp else "\n(none)")
    )


def build_side_text(settings) -> str:
    side = "NEG" if settings.side == "neg" else "AFF"
    return f"=== SIDE ===\nThe debater is on the {side} side this round.\n\n"


async def call_coach(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured on server")

    round_raw = payload.get("round", {})
    round_doc = migrate_round_document(round_raw)
    message = payload.get("message", "")
    settings = round_doc.settings

    side_text = build_side_text(settings)
    flows_text = build_flows_text(round_doc)
    files_text = build_files_text(round_doc)
    context, truncated = truncate_context(side_text, flows_text, files_text)

    full_user = context + "\n\n=== DEBATER'S REQUEST ===\n" + message

    messages: list[dict[str, str]] = []
    history = payload.get("messages") or []
    for i, m in enumerate(history):
        role = m.get("role", "user")
        content = m.get("content", m.get("text", ""))
        if role == "user" and i == len(history) - 1:
            messages.append({"role": "user", "content": full_user})
        elif role in ("user", "assistant"):
            messages.append({"role": role, "content": content})

    if not messages:
        messages = [{"role": "user", "content": full_user}]

    client = anthropic.Anthropic(api_key=api_key)
    try:
        resp = client.messages.create(
            model=settings.model,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
    except anthropic.APIError as e:
        raise RuntimeError(str(e)) from e

    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    return {"text": text or "(empty response)", "truncated": truncated}
