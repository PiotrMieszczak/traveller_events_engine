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
