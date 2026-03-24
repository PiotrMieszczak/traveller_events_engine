# Drinax Engine Constitution

## Prime Directive

**Don't guess. Don't overengineer. Always verify.**

- Uncertain about architecture? Read the code, don't assume.
- Tempted to add "flexibility"? Solve the current problem only.
- Think it works? Run the tests. Check the output. Prove it.

This rule overrides all others. When in doubt, verify first.

## Core Principles

### I. Monorepo Structure

Two separate git repositories coexist under `traveller-event-tracker/`:

**`traveller_events_engine/`** — Nx + pnpm monorepo (JS) + uv (Python):
- `apps/web/` — Next.js 14 App Router (SSR, Leaflet map, Mantine UI)
- `apps/api/` — FastAPI (Python 3.12+, SQLModel, aiosqlite)
- `packages/types/` — Shared TypeScript types (Zod → JSON Schema → Pydantic)
- `packages/traveller-sdk/` — Travellermap.com API wrapper
- `packages/map-tokens/` — Inline SVG token components
- `packages/ag-ui-chat/` — Custom AG-UI chat library

**`chat-ag-ui/`** — Standalone AG-UI chat window library (linked via pnpm workspace).

New code goes in the right layer. Feature-specific components stay in `apps/web/components/`. Shared packages extracted only when used in 2+ places.

### II. Frontend Stack (Non-Negotiable)

**Framework:** Next.js 14+ with App Router. All new pages use App Router conventions.

**UI Components:** Mantine v7. Use Mantine primitives before writing custom HTML.

**Styling:** CSS Modules (`.module.css`) for custom styles. CSS Variables and modern CSS (Grid, Flexbox) for layout.

**FORBIDDEN:** Tailwind CSS, utility-first frameworks, inline styles (except dynamic values computed at runtime). Rationale: Tailwind produces generic markup and discourages intentional design.

**Map:** Leaflet + react-leaflet with `CRS.Simple` (flat pixel coordinate system, NOT geographic lat/lng). Always `dynamic(() => import(...), { ssr: false })` — Leaflet cannot render server-side.

### III. Backend Stack (Non-Negotiable)

**Framework:** FastAPI (Python 3.12+). All endpoints are async.

**Database:** SQLite via SQLModel + aiosqlite. Connection string: `sqlite+aiosqlite:///./drinax.db`. Always `expire_on_commit=False` on sessions.

**Real-time:** Server-Sent Events (SSE). Add `X-Accel-Buffering: no` header for Nginx compatibility.

**LLM Access:** LiteLLM → Ollama / OpenAI / Anthropic. All LLM calls go through LiteLLM. No direct provider SDK calls in game logic.

**CORS:** Never use `allow_origins=["*"]` with `allow_credentials=True`. List explicit origins.

### IV. Type System

Shared types live in `packages/types/`. TypeScript types are defined with Zod → exported as JSON Schema → Pydantic models generated via `nx run types:generate`.

Never duplicate type definitions across frontend and backend. If a type exists in `packages/types/`, import it.

### V. Role System

Two roles, enforced at every layer:

**Referee:** Full access — entity placement, time advancement, doom clock control, all SSE streams unfiltered.

**Player:** Read-only filtered view — hidden entities stripped, read-only map interactions only.

Role is determined at the session/page level and passed down as a prop. Components must respect role boundaries. Never trust client-side role claims for mutations — validate role server-side.

### VI. AG-UI Agent Protocol

The LLM agent communicates via AG-UI protocol over SSE:
- POST `{endpoint}` → init (`{status:'ready'}`) or message (`{status:'queued'}`)
- GET `{endpoint}/sse` → SSE stream of `RunStarted`, `TextMessageStart`, `TextMessageContent`, `TextMessageEnd`, `RunFinished` events

`ChatProvider` from `chat-ag-ui` wraps all agent interaction. `useReadableContext` injects game state into agent context. No direct SSE manipulation outside these primitives.

## Development Workflow

### VII. Testing Standards

**Frontend (Jest):** Unit tests for utility functions and hooks. Component tests for non-trivial logic.

**Backend (pytest):** All FastAPI endpoints have at least one integration test. Tests use a real SQLite in-memory database — no mocking the database layer.

**E2E (Playwright):** Critical user paths only:
- Map renders and hex click returns system info
- Referee can move player token
- Agent chat sends and receives a response

E2E is not for comprehensive coverage — it guards blocking workflows.

### VIII. Hex Coordinate System

The Trojan Reach sector uses **pointy-top hexes** with 1-indexed columns and rows (col 1–32, row 1–40).

**CRS.Simple coordinate conversion (CRITICAL):**
- `e.latlng.lng` = pixel X
- `e.latlng.lat` = `SECTOR_H - pixel_Y` (y-axis is inverted in CRS.Simple)
- Always apply `py = SECTOR_H - e.latlng.lat` when converting from Leaflet coordinates to image pixels

Hex geometry constants live in `components/TravellerMap/constants.ts`. Never inline these values.

### IX. Travellermap API

**Sector image:** `GET https://travellermap.com/api/poster?sector=Trojan+Reach&scale=64&style=poster&options=41975`
- Returns a 1801×2604px PNG. Cache with 24h headers.
- Proxied via `apps/web/app/api/sector-image/route.ts`

**World data:** `GET https://travellermap.com/api/sec?sector=Trojan+Reach&type=TabDelimited`
- Tab-delimited SEC format. Parse and cache in module scope.
- Proxied via `apps/web/app/api/world/route.ts`

Never call travellermap.com directly from the frontend. Always go through the proxy routes.

## Governance

### X. Constitution Authority

This constitution supersedes default practices, AI assistant assumptions, and "best practice" suggestions that contradict it.

Amendments require:
1. Written justification for the change
2. Impact assessment on existing code
3. Migration plan if breaking existing patterns

### XI. Simplicity Mandate

**YAGNI enforced.** Do not add:
- Abstractions for hypothetical future needs
- Configuration for scenarios that don't exist
- Features not explicitly requested

If it's not needed today, it doesn't belong in the codebase.

This constitution is the source of truth for architectural decisions. All PRs and code reviews must verify compliance.

**Version:** 1.0.0 | **Ratified:** 2026-03-24
