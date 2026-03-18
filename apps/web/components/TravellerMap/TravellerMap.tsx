'use client'

import { useState } from 'react'
import { MapContainer, ImageOverlay } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import classes from './TravellerMap.module.css'
import EntityLayer from './EntityLayer'
import MapLoader from './MapLoader'
import HexClickHandler from './HexClickHandler'
import SystemPanel from './SystemPanel'
import { SECTOR_W, SECTOR_H } from './constants'

const SECTOR_IMAGE_URL = '/api/sector-image'

const SECTOR_BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [SECTOR_H, SECTOR_W],
]

const MAP_CENTER: L.LatLngTuple = [SECTOR_H / 2, SECTOR_W / 2]
const DEFAULT_ZOOM = 0
const MIN_ZOOM = -1
const MAX_ZOOM = 3

const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [-256, -256],
  [SECTOR_H + 256, SECTOR_W + 256],
]

interface TravellerMapProps {
  entities?: import('@drinax/types').Entity[]
}

export default function TravellerMap({ entities = [] }: TravellerMapProps) {
  const [loaded, setLoaded] = useState(false)
  const [selectedHex, setSelectedHex] = useState<string | null>(null)

  return (
    <div className={classes.mapWrapper}>
      {!loaded && <MapLoader />}
      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        crs={L.CRS.Simple}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        style={{ width: '100%', height: '100%' }}
      >
        <ImageOverlay
          url={SECTOR_IMAGE_URL}
          bounds={SECTOR_BOUNDS}
          attribution='Map data: <a href="https://travellermap.com">travellermap.com</a>'
          eventHandlers={{ load: () => setLoaded(true) }}
        />
        <EntityLayer entities={entities} />
        <HexClickHandler onHexClick={setSelectedHex} />
      </MapContainer>
      <SystemPanel hex={selectedHex} onClose={() => setSelectedHex(null)} />
    </div>
  )
}
