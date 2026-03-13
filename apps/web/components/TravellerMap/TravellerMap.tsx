'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import classes from './TravellerMap.module.css'
import EntityLayer from './EntityLayer'

// Tile URL routes through our Next.js proxy which converts z/x/y
// to travellermap's x/y/scale format
const TILE_URL = '/api/tiles/{z}/{x}/{y}'

// --- Trojan Reach coordinate calibration ---
// Travellermap sector coords: Trojan Reach is at sector X=-4, Y=0
// A sector is 32 hexes wide × 40 hexes tall.
// At scale=64px/parsec, each hex ≈ 1 parsec:
//   Sector width  = 32 × 64 = 2048 px  → 8 tiles of 256px
//   Sector height = 40 × 64 = 2560 px  → 10 tiles of 256px
//
// The tile proxy passes Leaflet tile x,y directly to travellermap's API.
// Trojan Reach sector spans tiles:
//   x: -4*8 = -32  to  -4*8+8 = -24   (i.e. tiles -32 … -25)
//   y:  0*10 = 0   to   0*10+10 = 10  (i.e. tiles 0 … 9)
//
// In CRS.Simple pixel space: pixel = tile * 256
//   Sector left px  = -32 * 256 = -8192
//   Sector right px = -24 * 256 = -6144   → center x = -7168
//   Sector top px   =   0 * 256 = 0
//   Sector bot px   =  10 * 256 = 2560    → center y = 1280
//
// Leaflet CRS.Simple uses [lat=y, lng=x]
const MAP_CENTER: L.LatLngTuple = [1280, -7168]
const DEFAULT_ZOOM = 2
const MIN_ZOOM = 1
const MAX_ZOOM = 6

// Constrain panning to Trojan Reach sector bounds (with small padding)
const SECTOR_BOUNDS: L.LatLngBoundsExpression = [
  [0 - 256, -8192 - 256],       // SW: top-left with 1-tile padding
  [2560 + 256, -6144 + 256],    // NE: bottom-right with 1-tile padding
]

interface TravellerMapProps {
  entities?: import('@drinax/types').Entity[]
}

export default function TravellerMap({ entities = [] }: TravellerMapProps) {
  return (
    <div className={classes.mapWrapper}>
      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        crs={L.CRS.Simple}
        maxBounds={SECTOR_BOUNDS}
        maxBoundsViscosity={0.8}
        style={{ width: '100%', height: '100%' }}
        preferCanvas={true}
      >
        <TileLayer
          url={TILE_URL}
          attribution='Map data: <a href="https://travellermap.com">travellermap.com</a>'
          tileSize={256}
          noWrap={true}
        />
        <EntityLayer entities={entities} />
      </MapContainer>
    </div>
  )
}
