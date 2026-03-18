import { NextRequest, NextResponse } from 'next/server'

// Fetches world data from travellermap SEC tab-delimited format.
// Query: ?hex=XXYY  (e.g. ?hex=0306 for col 03, row 06)
//
// SEC columns: Sector SS Hex Name UWP Bases Remarks Zone PBG Allegiance Stars {Ix} (Ex) [Cx] Nobility W RU

const SEC_URL =
  'https://travellermap.com/api/sec?sector=Trojan+Reach&type=TabDelimited&milieu=M1105'

// UWP decode maps
const STARPORT: Record<string, string> = {
  A: 'Excellent', B: 'Good', C: 'Routine', D: 'Poor', E: 'Frontier', X: 'None',
}
const SIZE_LABEL: Record<string, string> = {
  '0': 'Asteroid/Small', '1': '1,600km', '2': '3,200km', '3': '4,800km',
  '4': '6,400km', '5': '8,000km', '6': '9,600km', '7': '11,200km',
  '8': '12,800km', '9': '14,400km', A: '16,000km',
}
const ATM_LABEL: Record<string, string> = {
  '0': 'None', '1': 'Trace', '2': 'Very Thin (tainted)', '3': 'Very Thin',
  '4': 'Thin (tainted)', '5': 'Thin', '6': 'Standard', '7': 'Standard (tainted)',
  '8': 'Dense', '9': 'Dense (tainted)', A: 'Exotic', B: 'Corrosive',
  C: 'Insidious', D: 'Dense (high)', E: 'Thin (low)', F: 'Unusual',
}
const HYD_LABEL: Record<string, string> = {
  '0': '0%', '1': '10%', '2': '20%', '3': '30%', '4': '40%',
  '5': '50%', '6': '60%', '7': '70%', '8': '80%', '9': '90%', A: '100%',
}
const GOV_LABEL: Record<string, string> = {
  '0': 'No Government', '1': 'Company/Corporation', '2': 'Participating Democracy',
  '3': 'Self-Perpetuating Oligarchy', '4': 'Representative Democracy',
  '5': 'Feudal Technocracy', '6': 'Captive Government', '7': 'Balkanization',
  '8': 'Civil Service Bureaucracy', '9': 'Impersonal Bureaucracy',
  A: 'Charismatic Dictator', B: 'Non-Charismatic Leader', C: 'Charismatic Oligarchy',
  D: 'Religious Dictatorship',
}
const LAW_LABEL: Record<string, string> = {
  '0': 'No Law', '1': 'Banned: Body Pistols, Explosives, Poison Gas',
  '2': 'Banned: Portable Energy Weapons', '3': 'Banned: Machine Guns',
  '4': 'Banned: Light Assault Weapons', '5': 'Banned: Personal Concealable Weapons',
  '6': 'Banned: All Firearms', '7': 'Banned: Shotguns',
  '8': 'Banned: Blade Weapons', '9': 'Banned: All Weapons',
}
const ZONE_LABEL: Record<string, string> = {
  '': 'Green (Safe)', A: 'Amber (Caution)', R: 'Red (Restricted)',
}

function decodeUWP(uwp: string) {
  if (!uwp || uwp.length < 9) return null
  const [port, size, atm, hyd, pop, gov, law, , tl] = uwp.split('')
  const popExp = parseInt(pop, 16)
  return {
    starport: STARPORT[port] ?? port,
    size: SIZE_LABEL[size.toUpperCase()] ?? size,
    atmosphere: ATM_LABEL[atm.toUpperCase()] ?? atm,
    hydrographics: HYD_LABEL[hyd.toUpperCase()] ?? hyd,
    population: popExp === 0 ? 'Uninhabited' : `~${Math.pow(10, popExp).toLocaleString()}`,
    government: GOV_LABEL[gov.toUpperCase()] ?? gov,
    lawLevel: LAW_LABEL[law] ?? `Level ${law}`,
    techLevel: parseInt(tl, 16),
    raw: uwp,
  }
}

export interface WorldData {
  hex: string
  name: string
  uwp: ReturnType<typeof decodeUWP>
  bases: string
  remarks: string[]
  zone: string
  allegiance: string
  stars: string
  importance: string
  economic: string
  cultural: string
  worldCount: number
  ru: number
}

// Cache parsed sector data in module scope for the lifetime of the server process.
// The SEC data is static (milieu M1105) — no need to re-fetch between requests.
let sectorCache: Map<string, WorldData> | null = null

async function getSectorData(): Promise<Map<string, WorldData>> {
  if (sectorCache) return sectorCache

  const res = await fetch(SEC_URL, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`SEC fetch failed: ${res.status}`)

  const text = await res.text()
  const lines = text.split('\n').filter(Boolean)

  // Skip comment lines and find header
  const headerIdx = lines.findIndex((l) => l.startsWith('Sector\t') || l.startsWith('Troj'))
  const dataLines = headerIdx >= 0
    ? lines.filter((l) => !l.startsWith('#') && !l.startsWith('Sector'))
    : lines.filter((l) => !l.startsWith('#'))

  const map = new Map<string, WorldData>()

  for (const line of dataLines) {
    const cols = line.split('\t')
    if (cols.length < 10) continue
    // Sector SS Hex Name UWP Bases Remarks Zone PBG Allegiance Stars {Ix} (Ex) [Cx] Nobility W RU
    const [, , hex, name, uwp, bases, remarks, zone, , allegiance, stars, ix, ex, cx, , wStr, ruStr] = cols
    if (!hex || hex.length !== 4) continue

    map.set(hex.trim(), {
      hex: hex.trim(),
      name: name?.trim() ?? '',
      uwp: decodeUWP(uwp?.trim() ?? ''),
      bases: bases?.trim() ?? '',
      remarks: (remarks?.trim() ?? '').split(' ').filter(Boolean),
      zone: ZONE_LABEL[zone?.trim() ?? ''] ?? 'Green (Safe)',
      allegiance: allegiance?.trim() ?? '',
      stars: stars?.trim() ?? '',
      importance: ix?.replace(/[{}]/g, '').trim() ?? '',
      economic: ex?.replace(/[()]/g, '').trim() ?? '',
      cultural: cx?.replace(/[\[\]]/g, '').trim() ?? '',
      worldCount: parseInt(wStr ?? '0', 10) || 0,
      ru: parseInt(ruStr ?? '0', 10) || 0,
    })
  }

  sectorCache = map
  return map
}

export async function GET(request: NextRequest) {
  const hex = request.nextUrl.searchParams.get('hex')
  if (!hex || !/^\d{4}$/.test(hex)) {
    return NextResponse.json({ error: 'hex param required (4 digits, e.g. 0306)' }, { status: 400 })
  }

  try {
    const data = await getSectorData()
    const world = data.get(hex)
    if (!world) {
      return NextResponse.json({ empty: true, hex }, { status: 200 })
    }
    return NextResponse.json(world)
  } catch (err) {
    console.error('World lookup error:', err)
    return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 502 })
  }
}
