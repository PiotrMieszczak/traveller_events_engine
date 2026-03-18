'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChatProvider, useReadableContext } from 'chat-ag-ui'
import ChatUI from './ChatUI'
import classes from './AgentDrawer.module.css'
import type { Entity } from '@drinax/types'

const ENDPOINT = '/api/agent'
const MIN_HEIGHT = 120
const MAX_HEIGHT_VH = 0.8
const DEFAULT_HEIGHT = 320
const STORAGE_KEY = 'agentDrawerHeight'

interface AgentDrawerProps {
  entities: Entity[]
  doomClock?: Record<string, number>
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
