# MX Flow

Local-first policy debate flow app with Verbatim-style grids, IndexedDB archive, and Python-proxied AI coach.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set your Anthropic API key (server-side only)
export ANTHROPIC_API_KEY=sk-ant-...

uvicorn server.main:app --reload
```

Open [http://localhost:8000](http://localhost:8000).

Without `ANTHROPIC_API_KEY`, the grid and archive work; the coach shows instructions to start the server with a key.

## Features (v1)

- Partner 1 / Partner 2 tabs with position sub-tabs (Aff/Neg flows)
- Verbatim-style grid: speech columns, keyboard shortcuts (Enter = new row, Shift+Enter = newline), Tab navigation, dropped/conceded marks
- IndexedDB autosave (300ms debounce) + `.mxflow` export/import
- Uploaded cards persisted in round document (survives refresh)
- AI coach via `POST /api/coach` (no browser API key)

## Project layout

```
server/          FastAPI app + coach proxy
static/          HTML/CSS/JS UI
schema/          RoundDocument JSON schema
tests/           pytest unit/API tests
e2e/             Playwright tests
Joseph_draft.html  Original prototype (reference)
```

## Keyboard shortcuts (grid)

| Shortcut | Action |
|----------|--------|
| Enter | Insert row below, focus same column |
| Cmd/Ctrl+Enter | Move down one row |
| Cmd/Ctrl+Shift+Enter | Next position tab |
| Shift+Enter | Newline in cell (while editing) |
| Tab | Move to next column |
| Ctrl+[ / Ctrl+] | Previous / next partner tab |
| Ctrl+1–9 | Jump to position tab by number |

## Tests

```bash
pytest
npx playwright test   # requires: npm install && npx playwright install
```

## Deferred (follow-up PR)

- WebSocket partner sync + VPS deploy
