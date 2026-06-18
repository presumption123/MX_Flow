# MX Flow Design System (v1)

Dense workspace UI for tournament policy debate flowing. Not a marketing site.

## Color tokens

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0d1117` | App background |
| `--bg-alt` | `#161b22` | Topbar, tabs, sidebar |
| `--bg-elev` | `#1c2129` | Buttons, elevated surfaces |
| `--border` | `#30363d` | Grid lines, dividers |
| `--accent` | `#58a6ff` | Active tab, focus ring |
| `--dropped` | `#5a1e1e` | Dropped cells |
| `--conceded` | `#1e4d2b` | Conceded cells |
| `--text` | `#c9d1d9` | Body (13–14px chrome, 12px cells) |
| `--text-dim` | `#8b949e` | Secondary labels |

## Typography

| Role | Font | Size |
|------|------|------|
| Chrome | IBM Plex Sans | 13–14px, weight 500–600 |
| Flow cells | IBM Plex Mono | 12px |
| Coach | IBM Plex Mono | 12px |

Self-hosted woff2 in `static/fonts/`. No CDN.

## Layout

| Element | Spec |
|---------|------|
| Topbar | 44px |
| Partner tabs | 40px segmented control |
| Position tabs | 36px, horizontal scroll |
| Coach sidebar | 320px desktop; collapsed rail <1280px; bottom sheet <1024px |
| Cell min-height | 48px |
| Archive panel | 360px left slide-over |

## Anti-slop

- No emoji in chrome (text labels only)
- No hero, cards-as-marketing, or purple gradients
- Utility copy: "Upload cards", "Archive", "Settings"

## Navigation (3 levels)

1. Round context — topbar title
2. Partner — segmented tabs + breadcrumb
3. Position — scrollable Aff/Neg tabs
4. Grid — speech columns × argument rows
