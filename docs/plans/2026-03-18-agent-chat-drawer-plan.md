# Agent Chat Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the `chat-ag-ui` headless library into the Traveller Engine as a resizable bottom drawer with a mock AG-UI backend.

**Architecture:** `chat-ag-ui` is added as a pnpm workspace dependency to `apps/web`. A mock SSE endpoint at `/api/agent/sse` streams AG-UI events server-side (no MSW). `AgentDrawer` wraps `ChatProvider` and renders as a `position: fixed` bottom drawer with drag-to-resize and a `/` keyboard shortcut.

**Tech Stack:** Next.js 14 App Router, chat-ag-ui 0.1.0, CSS Modules, pnpm workspaces

---

## How the AgentClient protocol works (read before implementing)

The `AgentClient` in `chat-ag-ui` does two things on connect:
1. `POST {endpoint}` with `{ type: 'init', tools: [...], context: {...} }` → expects `{ status: 'ready' }`
2. Opens `EventSource` at `{endpoint}/sse` → expects SSE stream

On `send(message)`:
- `POST {endpoint}` with `{ type: 'message', content: string, tools: [...], context: {...} }`
- Expects `{ status: 'queued' }` — the SSE stream then delivers the response

SSE events the client understands:
```
RunStarted         { runId: string }
TextMessageStart   { messageId: string, role: 'assistant' }
TextMessageContent { messageId: string, delta: string }
TextMessageEnd     { messageId: string }
RunFinished        { runId: string }
```

Each SSE event is formatted as:
```
event: EventName\ndata: {"key":"value"}\n\n
```

The SSE endpoint (`/sse`) is a GET that streams indefinitely. The mock design: `/sse` streams a response triggered by the last message stored in a server-side queue. For simplicity, use a stateless approach: the `/sse` GET reads a `?msg=` query param (set by the POST handler via a redirect/URL) — actually simpler: make `/sse` a POST-triggered stream by storing last message in a module-level variable (works in dev; for mock purposes this is fine).

**Simplest mock approach:** `/api/agent` handles POST (init + message), stores last message in module scope. `/api/agent/sse` is a GET that reads `?q=` param containing the message, streams a response, and closes. The POST handler for `type: 'message'` returns `{ status: 'queued', q: encodedMessage }` — but since AgentClient doesn't use that…

**Actually simplest:** Make the SSE stream self-contained. The POST for `type: 'message'` stores the message. The GET `/sse` streams a response for whatever the last stored message was. Module-level `let lastMessage = ''` works in Next.js dev (single process).

---

## Task 1: Add chat-ag-ui as workspace dependency

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-workspace.yaml` (root)

**Step 1: Check chat-ag-ui is built**

```bash
ls /home/pmieszczak/projects/ai-projekty/traveller-event-tracker/chat-ag-ui/dist/
```
Expected: `index.js`, `index.cjs`, `index.d.ts` present. If not, run:
```bash
cd /home/pmieszczak/projects/ai-projekty/traveller-event-tracker/chat-ag-ui && yarn build
```

**Step 2: Add chat-ag-ui to pnpm-workspace.yaml**

Current `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/web"
  - "packages/*"
```

The `chat-ag-ui` dir is outside `traveller_events_engine/` — it's a sibling. Add it:
```yaml
packages:
  - "apps/web"
  - "packages/*"
  - "../../chat-ag-ui"
```

**Step 3: Add dependency to apps/web/package.json**

Add to `dependencies`:
```json
"chat-ag-ui": "workspace:*"
```

**Step 4: Install**

```bash
cd /home/pmieszczak/projects/ai-projekty/traveller-event-tracker/traveller_events_engine
pnpm install
```
Expected: no errors, `chat-ag-ui` symlinked in `apps/web/node_modules/`

**Step 5: Verify import resolves**

```bash
node -e "require('/home/pmieszczak/projects/ai-projekty/traveller-event-tracker/traveller_events_engine/apps/web/node_modules/chat-ag-ui/dist/index.cjs')" 2>&1 | head -5
```
Expected: no error (or just `{}` output)

**Step 6: Commit**

```bash
git add pnpm-workspace.yaml apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add chat-ag-ui as workspace dependency"
```

---

## Task 2: Mock SSE API route

**Files:**
- Create: `apps/web/app/api/agent/route.ts` — handles POST (init + message)
- Create: `apps/web/app/api/agent/sse/route.ts` — handles GET, streams SSE

**Step 1: Create the POST handler**

```ts
// apps/web/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Module-level store for the last message and context.
// Works in dev (single process). Mock only — not for production.
export let lastMessage = ''
export let lastContext: Record<string, unknown> = {}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    type: 'init' | 'message'
    content?: string
    context?: Record<string, unknown>
  }

  if (body.context) {
    lastContext = body.context
  }

  if (body.type === 'init') {
    return NextResponse.json({ status: 'ready' })
  }

  if (body.type === 'message' && body.content) {
    lastMessage = body.content
    return NextResponse.json({ status: 'queued' })
  }

  return NextResponse.json({ error: 'Unknown request type' }, { status: 400 })
}
```

**Step 2: Create the SSE GET handler**

```ts
// apps/web/app/api/agent/sse/route.ts
import { NextResponse } from 'next/server'
import { lastMessage, lastContext } from '../route'

function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

function pickResponse(msg: string, context: Record<string, unknown>): string {
  const lower = msg.toLowerCase()

  if (lower.includes('doom')) {
    const doom = context['doomClock'] as Record<string, number> | undefined
    if (doom) {
      return `Doom Clock status — PRI: ${doom.pri}/12, Aslan Heat: ${doom.aslanHeat}/10, Imperium Heat: ${doom.imperiumHeat}/10.`
    }
    return 'No doom clock data available in current context.'
  }

  if (lower.includes('entit') || lower.includes('ship')) {
    const entities = context['entities'] as unknown[] | undefined
    if (entities && entities.length > 0) {
      return `There are currently ${entities.length} tracked entities on the map.`
    }
    return 'No entities currently tracked on the map.'
  }

  if (lower.includes('hex') || lower.includes('system') || lower.includes('world')) {
    return 'Click any hex on the map to view system data in the info panel.'
  }

  return `Analyzing campaign data... I can answer questions about the doom clock, tracked ships and entities, or hex systems. Try asking "what is the doom clock?" or "how many entities are on the map?"`
}

export async function GET() {
  const msg = lastMessage || 'hello'
  const context = lastContext
  const response = pickResponse(msg, context)
  const words = response.split(' ')

  const encoder = new TextEncoder()
  const runId = `run-${Date.now()}`
  const messageId = `msg-${Date.now()}`

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (name: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(name, data)))

      enqueue('RunStarted', { runId })
      enqueue('TextMessageStart', { messageId, role: 'assistant' })

      for (const word of words) {
        await new Promise(r => setTimeout(r, 50))
        enqueue('TextMessageContent', { messageId, delta: word + ' ' })
      }

      enqueue('TextMessageEnd', { messageId })
      enqueue('RunFinished', { runId })
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

**Step 3: Verify routes exist**

```bash
ls apps/web/app/api/agent/
```
Expected: `route.ts  sse/`

**Step 4: Commit**

```bash
git add apps/web/app/api/agent/
git commit -m "feat: add mock AG-UI SSE endpoint"
```

---

## Task 3: ChatUI inner component

**Files:**
- Create: `apps/web/components/AgentDrawer/ChatUI.tsx`
- Create: `apps/web/components/AgentDrawer/ChatUI.module.css`

This component renders inside `ChatProvider`. It uses the headless primitives with render props.

**Step 1: Create ChatUI.tsx**

```tsx
// apps/web/components/AgentDrawer/ChatUI.tsx
'use client'

import { MessageList, ChatInput, ConnectionStatus, useChatAgent } from 'chat-ag-ui'
import type { Message } from 'chat-ag-ui'
import classes from './ChatUI.module.css'

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const text = message.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map(c => c.text)
    .join('')

  return (
    <div className={`${classes.bubble} ${isUser ? classes.userBubble : classes.agentBubble}`}>
      <span className={classes.role}>{isUser ? 'YOU' : 'AGENT'}</span>
      <p className={classes.text}>{text}</p>
    </div>
  )
}

export default function ChatUI() {
  const { isStreaming } = useChatAgent()

  return (
    <div className={classes.chatUI}>
      {/* Connection status bar */}
      <ConnectionStatus>
        {({ status }) => (
          <div className={`${classes.statusBar} ${classes[`status_${status}`]}`}>
            <span className={classes.statusDot} />
            <span className={classes.statusText}>{status}</span>
          </div>
        )}
      </ConnectionStatus>

      {/* Message list */}
      <MessageList className={classes.messageList} autoScroll>
        {({ messages }) => (
          <>
            {messages.length === 0 && (
              <div className={classes.emptyState}>
                Ask about the doom clock, entities, or hex systems…
              </div>
            )}
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && (
              <div className={classes.typingIndicator}>
                <span /><span /><span />
              </div>
            )}
          </>
        )}
      </MessageList>

      {/* Input */}
      <ChatInput placeholder="Ask the agent…" submitOnEnter>
        {({ value, onChange, onKeyDown, onSubmit, isDisabled, placeholder }) => (
          <form className={classes.inputRow} onSubmit={onSubmit}>
            <input
              className={classes.input}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isDisabled}
              placeholder={placeholder}
              autoComplete="off"
            />
            <button
              type="submit"
              className={classes.sendButton}
              disabled={isDisabled || !value.trim()}
            >
              Send
            </button>
          </form>
        )}
      </ChatInput>
    </div>
  )
}
```

**Step 2: Create ChatUI.module.css**

```css
/* apps/web/components/AgentDrawer/ChatUI.module.css */

.chatUI {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Status bar */
.statusBar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-bottom: 1px solid #e0e8f0;
  background: #f0f4f8;
}

.statusDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #aaa;
}

.statusText { color: #6a8090; }

.status_connected .statusDot { background: #2a7a44; }
.status_connected .statusText { color: #2a7a44; }
.status_connecting .statusDot { background: #c07a10; animation: pulse 1s infinite; }
.status_error .statusDot { background: #b02020; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Message list */
.messageList {
  flex: 1;
  padding: 12px 14px;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
}

.emptyState {
  color: #9aacbc;
  font-size: 13px;
  text-align: center;
  margin-top: 20px;
  font-style: italic;
}

/* Bubbles */
.bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.userBubble {
  background: #1a6090;
  color: #fff;
  align-self: flex-end;
  margin-left: auto;
}

.agentBubble {
  background: #fff;
  border: 1px solid #d8e4ec;
  color: #1a2e3e;
  align-self: flex-start;
}

.role {
  font-size: 8px;
  letter-spacing: 0.15em;
  font-weight: 700;
  display: block;
  margin-bottom: 4px;
  opacity: 0.6;
  font-family: 'Courier New', monospace;
}

.text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* Typing indicator */
.typingIndicator {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  align-self: flex-start;
}

.typingIndicator span {
  width: 6px;
  height: 6px;
  background: #9aacbc;
  border-radius: 50%;
  animation: bounce 1.2s ease-in-out infinite;
}

.typingIndicator span:nth-child(2) { animation-delay: 0.2s; }
.typingIndicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

/* Input row */
.inputRow {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #d8e4ec;
  background: #fff;
}

.input {
  flex: 1;
  border: 1px solid #c8d4dc;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  color: #1a2e3e;
  outline: none;
  transition: border-color 0.15s;
}

.input:focus { border-color: #3a7ca5; }
.input:disabled { background: #f0f4f8; color: #9aacbc; }

.sendButton {
  padding: 7px 16px;
  background: #1a6090;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.sendButton:hover:not(:disabled) { background: #15507a; }
.sendButton:disabled { background: #b0c8d8; cursor: not-allowed; }
```

**Step 3: Commit**

```bash
git add apps/web/components/AgentDrawer/
git commit -m "feat: add ChatUI headless component"
```

---

## Task 4: AgentDrawer shell component

**Files:**
- Create: `apps/web/components/AgentDrawer/AgentDrawer.tsx`
- Create: `apps/web/components/AgentDrawer/AgentDrawer.module.css`
- Create: `apps/web/components/AgentDrawer/index.ts`

**Step 1: Create AgentDrawer.tsx**

```tsx
// apps/web/components/AgentDrawer/AgentDrawer.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChatProvider, useReadableContext } from 'chat-ag-ui'
import ChatUI from './ChatUI'
import classes from './AgentDrawer.module.css'
import type { Entity } from '@drinax/types'
import type { DoomClock } from '@drinax/types'

const ENDPOINT = '/api/agent'
const MIN_HEIGHT = 120
const MAX_HEIGHT_VH = 0.8
const DEFAULT_HEIGHT = 320
const STORAGE_KEY = 'agentDrawerHeight'

interface AgentDrawerProps {
  entities: Entity[]
  doomClock?: DoomClock
}

// Inner component — inside ChatProvider, so hooks work
function DrawerContent({ entities, doomClock }: AgentDrawerProps) {
  useReadableContext('entities', entities, {
    description: 'Current tracked entities on the map',
  })
  useReadableContext('doomClock', doomClock ?? null, {
    description: 'Current doom clock values (pri, aslanHeat, imperiumHeat)',
  })
  return <ChatUI />
}

export default function AgentDrawer({ entities, doomClock }: AgentDrawerProps) {
  const [open, setOpen] = useState(false)
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_HEIGHT
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? String(DEFAULT_HEIGHT), 10)
  })

  const dragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  // Persist height
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(height))
  }, [height])

  // Keyboard shortcut: '/' toggles drawer (ignore when in input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '/') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Drag-to-resize
  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = height
    e.preventDefault()
  }, [height])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = dragStartY.current - e.clientY
      const maxH = window.innerHeight * MAX_HEIGHT_VH
      const newH = Math.min(maxH, Math.max(MIN_HEIGHT, dragStartHeight.current + delta))
      setHeight(Math.round(newH))
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <>
      {/* Trigger button — visible when drawer is closed */}
      {!open && (
        <button
          className={classes.trigger}
          onClick={() => setOpen(true)}
          aria-label="Open agent chat"
        >
          Ask Agent
        </button>
      )}

      {/* Drawer */}
      <div
        className={`${classes.drawer} ${open ? classes.drawerOpen : ''}`}
        style={{ height: open ? height : 0 }}
        aria-hidden={!open}
      >
        {/* Drag handle — click to close, drag to resize */}
        <div
          className={classes.handle}
          onMouseDown={onDragStart}
          onClick={() => {
            if (!dragging.current) setOpen(false)
          }}
          title="Drag to resize · Click to close"
        >
          <span className={classes.handleGrip} />
        </div>

        {/* Chat content — only mount when open to avoid connecting on load */}
        {open && (
          <div className={classes.content}>
            <ChatProvider endpoint={ENDPOINT}>
              <DrawerContent entities={entities} doomClock={doomClock} />
            </ChatProvider>
          </div>
        )}
      </div>
    </>
  )
}
```

**Step 2: Create AgentDrawer.module.css**

```css
/* apps/web/components/AgentDrawer/AgentDrawer.module.css */

/* Trigger pill button */
.trigger {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  padding: 8px 20px;
  background: #1a6090;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(26, 96, 144, 0.4);
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}

.trigger:hover {
  background: #15507a;
  box-shadow: 0 4px 16px rgba(26, 96, 144, 0.5);
  transform: translateX(-50%) translateY(-1px);
}

/* Drawer */
.drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  background: #f8f9fa;
  border-top: 2px solid #3a7ca5;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: height 0.2s cubic-bezier(0.2, 0, 0, 1);
  display: flex;
  flex-direction: column;
}

.drawerOpen {
  /* height is set inline */
}

/* Drag handle */
.handle {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ns-resize;
  flex-shrink: 0;
  background: #f0f4f8;
  border-bottom: 1px solid #d8e4ec;
  user-select: none;
}

.handle:hover { background: #e4edf4; }

.handleGrip {
  width: 32px;
  height: 3px;
  background: #b0c8d8;
  border-radius: 2px;
}

/* Content area */
.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```

**Step 3: Create index.ts**

```ts
// apps/web/components/AgentDrawer/index.ts
export { default } from './AgentDrawer'
```

**Step 4: Commit**

```bash
git add apps/web/components/AgentDrawer/
git commit -m "feat: add AgentDrawer shell with resize and keyboard shortcut"
```

---

## Task 5: Wire AgentDrawer into CampaignView

**Files:**
- Modify: `apps/web/app/campaign/[id]/CampaignView.tsx`

`useGameState` currently returns `{ entities, connected, error }`. We need `doomClock` too — check if it's already there, if not pass `undefined` for now.

**Step 1: Check useGameState return type**

```bash
grep -A 10 "return {" apps/web/hooks/useGameState.ts
```

**Step 2: Update CampaignView.tsx**

Add the import and render `AgentDrawer` at the bottom of the `Box`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { Box, Text, Badge, Group } from '@mantine/core'
import { useGameState } from '../../../hooks/useGameState'
import AgentDrawer from '../../../components/AgentDrawer'

const TravellerMap = dynamic(
  () => import('../../../components/TravellerMap'),
  { ssr: false, loading: () => <Box h="100vh" bg="dark.9" /> }
)

interface CampaignViewProps {
  campaignId: string
  role: 'referee' | 'player'
}

export default function CampaignView({ campaignId, role }: CampaignViewProps) {
  const { entities, connected, error } = useGameState(campaignId, role)

  return (
    <Box pos="relative" h="100vh">
      <Group
        pos="absolute"
        top={12}
        left={12}
        style={{ zIndex: 1000 }}
        gap="xs"
      >
        <Badge color={connected ? 'green' : 'red'} variant="dot">
          {connected ? 'Live' : 'Connecting…'}
        </Badge>
        <Badge color="cyan" variant="outline">
          {role.toUpperCase()}
        </Badge>
        <Text size="xs" c="dimmed">
          {entities.length} entities
        </Text>
      </Group>

      {error && (
        <Text
          pos="absolute"
          top={40}
          left={12}
          size="xs"
          c="red"
          style={{ zIndex: 1000 }}
        >
          {error}
        </Text>
      )}

      <TravellerMap entities={entities} />
      <AgentDrawer entities={entities} />
    </Box>
  )
}
```

**Step 3: Also wire into the home page map (optional but useful for testing)**

The home page (`apps/web/app/page.tsx`) renders `TravellerMap` directly without a campaign. Add `AgentDrawer` there too for easy testing without needing the backend:

```tsx
// apps/web/app/page.tsx
import dynamic from 'next/dynamic'
import { Box } from '@mantine/core'
import AgentDrawer from '../components/AgentDrawer'

const TravellerMap = dynamic(
  () => import('../components/TravellerMap'),
  { ssr: false, loading: () => <Box h="100vh" bg="dark.9" /> }
)

export default function HomePage() {
  return (
    <>
      <TravellerMap />
      <AgentDrawer entities={[]} />
    </>
  )
}
```

**Step 4: Build check**

```bash
cd /home/pmieszczak/projects/ai-projekty/traveller-event-tracker/traveller_events_engine
nx run web:build 2>&1 | tail -20
```
Expected: build succeeds (or only pre-existing warnings)

**Step 5: Commit**

```bash
git add apps/web/app/campaign/ apps/web/app/page.tsx
git commit -m "feat: wire AgentDrawer into campaign view and home page"
```

---

## Task 6: Smoke test in browser

**Step 1: Start dev server**

```bash
nx run web:dev
```

**Step 2: Open http://localhost:3000**

Expected:
- Map renders
- "Ask Agent" pill button visible at bottom-center of screen

**Step 3: Click "Ask Agent"**

Expected:
- Drawer slides up (~320px)
- Status bar shows "connected"
- Input is active

**Step 4: Type "what is the doom clock?" and press Enter**

Expected:
- Message appears as user bubble
- Typing indicator appears briefly
- Agent response streams in word-by-word
- Response mentions doom clock (or "No doom clock data")

**Step 5: Test keyboard shortcut**

Click somewhere on the map (not in input), press `/`
Expected: drawer toggles closed/open

**Step 6: Test drag resize**

Drag the handle up/down
Expected: drawer height changes, persists after page refresh

**Step 7: Final commit if everything looks good**

```bash
git add -A
git commit -m "feat: ag-ui chat drawer integration complete (mock backend)"
git push
```
