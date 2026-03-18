import { NextResponse } from 'next/server'

// Fetches the entire Trojan Reach sector as a single poster image.
// Uses travellermap's /api/poster endpoint which renders the whole sector at once.
// Cached for 24h — the map never changes mid-campaign.
//
// Travellermap poster API:
//   https://travellermap.com/api/poster?sector=Trojan+Reach&scale=64&style=poster&options=41975
//
// scale=64 means 64px per parsec. A sector is 32×40 parsecs:
//   image width  = 32 * 64 = 2048px
//   image height = 40 * 64 = 2560px

const POSTER_URL =
  'https://travellermap.com/api/poster?sector=Trojan+Reach&scale=64&style=poster&options=41975'

export async function GET() {
  try {
    const res = await fetch(POSTER_URL, {
      next: { revalidate: 86400 },
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
    console.error('Sector image proxy error:', err)
    return new NextResponse('Sector image fetch failed', { status: 502 })
  }
}
