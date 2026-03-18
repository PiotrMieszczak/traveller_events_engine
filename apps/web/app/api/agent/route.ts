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
