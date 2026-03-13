'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import classes from './TravellerMap.module.css'

// Tile URL routes through our Next.js proxy which converts z/x/y
// to travellermap's x/y/scale format
const TILE_URL = '/api/tiles/{z}/{x}/{y}'

// CRS.Simple: coordinates are [y, x] pixel values (NOT lat/lng)
// Center at [0, 0] — will be calibrated once we test against live tiles
const MAP_CENTER: L.LatLngTuple = [0, 0]
const DEFAULT_ZOOM = 2
const MIN_ZOOM = 1
const MAX_ZOOM = 6

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
        style={{ width: '100%', height: '100%' }}
        preferCanvas={true}
      >
        <TileLayer
          url={TILE_URL}
          attribution='Map data: <a href="https://travellermap.com">travellermap.com</a>'
          tileSize={256}
          noWrap={true}
        />
      </MapContainer>
    </div>
  )
}
