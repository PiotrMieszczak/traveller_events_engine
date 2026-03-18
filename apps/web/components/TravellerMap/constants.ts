// Actual image dimensions from travellermap poster API at scale=64: 1801 × 2604px
// CRITICAL: bounds must match the exact image pixel dimensions.
// Leaflet stretches ImageOverlay to fill its bounds — any mismatch distorts hexes.

export const SECTOR_W = 1801
export const SECTOR_H = 2604

export const SECTOR_COLS = 32
export const SECTOR_ROWS = 40

// Pointy-top hex geometry (travellermap standard), derived from image dimensions.
// Even columns (02, 04, ...) are offset DOWN by half a row.
// Verified against computed hex centers matching known world positions.
export const HEX_R        = 37.441          // circumradius in pixels
export const HEX_W        = 64.850          // vertex-to-vertex width  = sqrt(3) * r
export const HEX_H        = 74.882          // flat-to-flat height     = 2 * r
export const COL_SPACING  = 56.162          // center-to-center horizontal = 1.5 * r
export const ROW_SPACING  = 64.850          // center-to-center vertical   = sqrt(3) * r
export const MARGIN_X     = -2.428          // px from image left to first hex center x
export const MARGIN_Y     = 0              // px from image top  to first hex center y
