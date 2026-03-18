'use client'

import { useMapEvents } from 'react-leaflet'
import {
  SECTOR_H, SECTOR_COLS, SECTOR_ROWS,
  HEX_W, HEX_H, COL_SPACING, ROW_SPACING, MARGIN_X, MARGIN_Y,
} from './constants'

// Pointy-top hex grid — even columns (1-indexed 02, 04…) are offset DOWN by half a row.
// Derived from the actual travellermap image geometry (verified with known world positions).
//
// Inverse formula: pixel (px, py) → hex (col, row) both 1-indexed
export function pixelToHex(px: number, py: number): string {
  // 0-indexed column from pixel x
  const col0 = Math.round((px - MARGIN_X - HEX_W / 2) / COL_SPACING)
  // even 1-indexed col (02, 04…) = odd 0-indexed
  const isEvenCol = col0 % 2 === 1
  const rowOffsetPy = isEvenCol ? ROW_SPACING / 2 : 0
  const row0 = Math.round((py - MARGIN_Y - HEX_H / 2 - rowOffsetPy) / ROW_SPACING)

  const col = Math.max(1, Math.min(SECTOR_COLS, col0 + 1))
  const row = Math.max(1, Math.min(SECTOR_ROWS, row0 + 1))
  return `${col.toString().padStart(2, '0')}${row.toString().padStart(2, '0')}`
}

interface HexClickHandlerProps {
  onHexClick: (hex: string) => void
}

export default function HexClickHandler({ onHexClick }: HexClickHandlerProps) {
  useMapEvents({
    click(e) {
      // CRS.Simple y-axis points UP (math convention), but our image y goes DOWN.
      // ImageOverlay at bounds [[0,0],[SECTOR_H,SECTOR_W]] means:
      //   lat=0 → bottom of image,  lat=SECTOR_H → top of image
      // So: y_from_top = SECTOR_H - lat
      const px = e.latlng.lng
      const py = SECTOR_H - e.latlng.lat
      onHexClick(pixelToHex(px, py))
    },
  })
  return null
}
