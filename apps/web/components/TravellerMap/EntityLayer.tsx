'use client'

import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { FreighterToken, PlayerToken } from '@drinax/map-tokens'
import type { Entity } from '@drinax/types'

// Hex to CRS.Simple pixel coordinate conversion
// These constants are approximate — will be calibrated against live tiles
const HEX_WIDTH = 35
const HEX_HEIGHT = 40

function hexToPixel(col: number, row: number): L.LatLngTuple {
  // CRS.Simple: [y, x] — y increases downward in screen space
  const x = col * HEX_WIDTH + (row % 2 === 0 ? 0 : HEX_WIDTH / 2)
  const y = row * HEX_HEIGHT * 0.75
  return [y, x]
}

function tokenForEntity(entity: Entity): JSX.Element {
  if (entity.entityType === 'player_ship') {
    return <PlayerToken size={28} />
  }
  return <FreighterToken size={24} />
}

interface EntityLayerProps {
  entities: Entity[]
}

export default function EntityLayer({ entities }: EntityLayerProps) {
  return (
    <>
      {entities.map((entity) => {
        const position = hexToPixel(entity.hex.col, entity.hex.row)
        const iconHtml = renderToStaticMarkup(tokenForEntity(entity))
        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
        return (
          <Marker key={entity.id} position={position} icon={icon}>
            <Popup>
              <strong>{entity.name}</strong>
              <br />
              {entity.hex.col.toString().padStart(2, '0')}
              {entity.hex.row.toString().padStart(2, '0')}
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
