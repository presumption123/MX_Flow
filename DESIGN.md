# MX Flow Design Tokens

Reference: New Sheet / Jay Flow v3 dark theme.

## Layout

| Token | Value |
|-------|-------|
| `--sidebar-width` | 260px |
| `--toolbar-height` | 38px |
| `--partner-tab-h` | 36px |
| `--coach-w` | 320px |
| `--radius` | 6px |

## Typography

- UI: Inter (Google Fonts)
- Grid: user-selectable (`Arial`, `Courier New`, `Times New Roman`)

## Themes

Applied via `data-theme` on `<html>`. Each theme sets aff/neg accent colors.

| Theme | App BG | Aff | Neg |
|-------|--------|-----|-----|
| dark (default) | #0a0a0a | #0a8fea | #ff4d00 |
| light | #ffffff | #2f80ed | #ef4444 |
| courtroom | #120f0b | #d8d2c5 | #9a5a2d |
| classic | #0d1117 | #58a6ff | #f85149 |
| paper | #f5f0e8 | #31572c | #8f1d2c |

## Active cell styles

- `outlineBlack` — inset outline on selection
- `filledBlue` — filled selection background
