# Agent Chat Drawer — Design

**Date:** 2026-03-18
**Status:** Approved

## Goal

Integrate the `chat-ag-ui` headless library into the Traveller Engine web app as a resizable bottom drawer with a mock AG-UI backend, so the referee can ask questions about the current campaign state.

---

## Architecture

Three additions to `apps/web`:

1. **Mock SSE endpoint** — `app/api/agent/sse/route.ts`
2. **`AgentDrawer` component** — `components/AgentDrawer/`
3. **Trigger** — floating pill button (bottom-center) + `/` keyboard shortcut

`chat-ag-ui` added to `apps/web` as a pnpm workspace dependency (`workspace:*`). No MSW — Next.js Route Handlers run server-side.

---

## Mock Backend

**Route:** `POST /api/agent/sse`
**Request body:** `{ messages: Message[], context?: Record<string, unknown> }`

Streams AG-UI SSE events word-by-word (~50ms delay):
```
RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT ×N → TEXT_MESSAGE_END → RUN_FINISHED
```

Keyword routing on last user message:
| Keyword | Response |
|---------|----------|
| `doom` | Streams doom clock values from context |
| `entities` / `ships` | Streams entity count + list from context |
| `hex` / `system` | "Use the map to click a system for details" |
| _(anything else)_ | Generic "Analyzing campaign data…" filler |

---

## AgentDrawer Component

**Files:**
```
components/AgentDrawer/
  AgentDrawer.tsx       — outer shell, resize logic, keyboard shortcut
  ChatUI.tsx            — inner component (inside ChatProvider)
  AgentDrawer.module.css
```

**Drawer behaviour:**
- `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`
- Height: `useState`, clamped `120px–80vh`, persisted to `localStorage`
- Slide-up via CSS `transition: height` on open/close
- Drag handle: `mousedown` → `window mousemove` adjusts height → `mouseup` clears

**Trigger:**
- Pill button `position: fixed, bottom: 16px, left: 50%` — visible when drawer closed
- `/` keydown on `document` toggles open/close (ignored when focus is in input/textarea)
- Clicking drag handle toggles when drawer is open

**Context registered via `useReadableContext`:**
- `entities` — current entity list from SSE game state
- `doomClock` — current doom clock values

**Styling:** Light/white background matching system panel. CSS Modules only, no Tailwind.

**Wiring:** `CampaignView` passes `entities` and `doomClock` as props to `AgentDrawer`.

---

## Files Changed

| File | Change |
|------|--------|
| `app/api/agent/sse/route.ts` | New — mock SSE stream |
| `components/AgentDrawer/AgentDrawer.tsx` | New |
| `components/AgentDrawer/ChatUI.tsx` | New |
| `components/AgentDrawer/AgentDrawer.module.css` | New |
| `app/campaign/[id]/CampaignView.tsx` | Add `AgentDrawer` |
| `package.json` (apps/web) | Add `chat-ag-ui: workspace:*` |

---

## Out of Scope

- Real LLM backend (Phase 2)
- Tool calls / state delta patches (Phase 2)
- Player role restrictions on chat
