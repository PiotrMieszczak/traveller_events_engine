import { NextRequest, NextResponse } from 'next/server'

// Travellermap tile API uses its own coordinate system, NOT slippy-map z/x/y.
// Endpoint: https://travellermap.com/api/tile?x={x}&y={y}&scale={scale}&options=41975&style=poster
//
// Coordinate conversion:
// - scale = 16 * 2^z (travellermap scale parameter for zoom level z)
// - x = tile_x (same as Leaflet tile x column)
// - y = tile_y (same as Leaflet tile y row)
//
// The proxy adds 24h cache headers to avoid hammering travellermap's API.

const TRAVELLERMAP_TILE_URL = 'https://travellermap.com/api/tile'
const DEFAULT_OPTIONS = 41975  // world names, sector names, borders, routes
const DEFAULT_STYLE = 'poster'

export async function GET(
  _request: NextRequest,
  { params }: { params: { z: string; x: string; y: string } }
) {
  const z = parseInt(params.z, 10)
  const x = parseInt(params.x, 10)
  const y = parseInt(params.y, 10)

  if (isNaN(z) || isNaN(x) || isNaN(y)) {
    return new NextResponse('Invalid tile coordinates', { status: 400 })
  }

  // Convert Leaflet zoom level to travellermap scale
  const scale = 16 * Math.pow(2, z)

  const upstream = new URL(TRAVELLERMAP_TILE_URL)
  upstream.searchParams.set('x', String(x))
  upstream.searchParams.set('y', String(y))
  upstream.searchParams.set('scale', String(scale))
  upstream.searchParams.set('options', String(DEFAULT_OPTIONS))
  upstream.searchParams.set('style', DEFAULT_STYLE)

  try {
    const res = await fetch(upstream.toString(), {
      next: { revalidate: 86400 },  // 24h SSR cache
    })

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status })
    }

    const imageBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/png'

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('Tile proxy error:', err)
    return new NextResponse('Tile fetch failed', { status: 502 })
  }
}
