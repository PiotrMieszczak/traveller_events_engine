import { useEffect, useRef, useState } from 'react'
import type { Entity } from '@drinax/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface GameState {
  entities: Entity[]
  connected: boolean
  error: string | null
}

export function useGameState(
  campaignId: string,
  role: 'referee' | 'player'
): GameState {
  const [state, setState] = useState<GameState>({
    entities: [],
    connected: false,
    error: null,
  })
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!campaignId) return

    const url = `${API_BASE}/api/stream/${role}/${campaignId}`
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('state_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setState({ entities: data.entities ?? [], connected: true, error: null })
      } catch {
        setState((prev) => ({ ...prev, error: 'Failed to parse state update' }))
      }
    })

    es.onerror = () => {
      setState((prev) => ({ ...prev, connected: false, error: 'SSE connection lost' }))
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [campaignId, role])

  return state
}
