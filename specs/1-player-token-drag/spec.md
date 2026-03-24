# Feature Specification: Player Token Drag-to-Move

**Feature ID**: 1-player-token-drag
**Status**: Draft
**Created**: 2026-03-24

---

## Summary

Replace the current SVG player ship token on the sector map with a PNG image asset, and allow the referee to reposition it by dragging it directly to a new hex. The new position snaps to the nearest hex center and is saved to the campaign database, making it visible to all connected clients immediately.

---

## Problem Statement

The player ship token currently uses a generic SVG icon. The campaign has a specific ship image (`chester_toke_ship.png`) that should represent the player ship visually. Additionally, there is no way to move the player token on the map without going through a backend data edit — the referee needs a direct, map-based way to reposition it during play.

---

## Goals

- Show the correct ship image for the player token on the map
- Allow the referee to move the player token by dragging it to a new hex
- Persist the new position immediately so all connected clients see the update
- Provide clear visual feedback when a move is registered

---

## Non-Goals

- Moving any entity other than the player ship by drag
- Players (non-referee role) moving the token
- Undo or redo of moves
- Collision detection or movement validation
- Offline / disconnected move queuing

---

## User Stories

### P1 — Core

**US-1**: As a referee, I want the player ship shown with its actual ship image so I can visually distinguish it from other tokens on the map.

**US-2**: As a referee, I want to drag the player ship to a new hex so I can update its position without leaving the map view.

**US-3**: As a referee, I want the token to snap to the nearest hex center after I release it so I know the position is registered correctly.

**US-4**: As a referee, I want the repositioned token to be visible to all connected players immediately so the map stays in sync.

### P2 — Polish

**US-5**: As a referee, I want a brief visual pulse on the token when I drop it so I have clear confirmation the move was saved.

---

## Functional Requirements

### FR-1: PNG Player Token
- The player ship token on the map must display the designated PNG image
- The token must render at a size appropriate for the hex grid (approximately 40×40px)
- The token must have a visual style (e.g. glow) that distinguishes it from cargo/NPC tokens

### FR-2: Referee-Only Dragging
- The player ship token must be draggable only when the current user has the referee role
- Players must see the token as non-interactive (no drag cursor, no movement)

### FR-3: Hex Snapping
- When the referee releases the token, it must snap to the center of the nearest valid hex
- The snap must happen immediately — the token must not remain at the drop pixel position

### FR-4: Position Persistence
- The new hex position must be saved to the campaign database on every successful drop
- The save must happen automatically — no explicit "confirm" step required

### FR-5: Real-time Propagation
- After saving, the updated position must be broadcast to all connected clients via the existing real-time stream
- All connected clients (referee + players) must see the token move within one stream update cycle

### FR-6: Drop Confirmation Animation
- After snapping, the token must play a brief animation (pulse/glow, ≤1 second) to confirm the move was registered
- The animation must complete before the next drag can begin

### FR-7: Error Resilience
- If the save request fails, the token must return to its previous hex position
- No silent failures — the referee must see an indication that the save failed

---

## User Scenarios & Testing

### Scenario 1: Referee drags token to a new hex (happy path)
1. Referee opens the map with referee role
2. Referee sees the player ship PNG token on its current hex
3. Referee clicks and drags the token to a different hex
4. On release, token snaps to the nearest hex center
5. Token plays a brief pulse animation
6. Token's new position appears on all connected clients' maps

**Expected**: Token is at the new hex for all clients. Position is persisted across page refresh.

### Scenario 2: Player views the map
1. Player opens the map with player role
2. Player sees the player ship PNG token on the map
3. Player tries to drag the token

**Expected**: Token does not move. No drag cursor appears on hover.

### Scenario 3: Save fails
1. Referee drags token to a new hex
2. Network request to save position fails
3. Token snaps back to previous hex

**Expected**: Token returns to original position. Referee sees an error indicator.

### Scenario 4: Token at map edge
1. Referee drags token near the edge of the sector map
2. Referee releases near an out-of-bounds area

**Expected**: Token snaps to the nearest valid hex within the sector bounds.

---

## Success Criteria

- SC-1: The player ship displays the PNG image correctly on all screen sizes without distortion
- SC-2: A referee can reposition the player ship in under 3 seconds (drag + release)
- SC-3: The position update appears on connected clients within 2 seconds of the drop
- SC-4: The new position survives a page refresh (confirmed via database persistence)
- SC-5: Players cannot drag the token (zero drag interactions possible in player role)
- SC-6: A failed save results in the token returning to its previous position (no ghost positions)

---

## Key Entities

### Entity (existing)
- `id: string` — unique entity identifier
- `entityType: 'player_ship' | ...` — determines token rendering and drag permissions
- `hex: { col: number, row: number }` — current position on the sector grid
- `campaignId: string` — scopes the entity to a campaign

### HexCoord (existing)
- `col: number` — 1-indexed column (1–32 for Trojan Reach)
- `row: number` — 1-indexed row (1–40 for Trojan Reach)

---

## Assumptions

- A1: The PNG file is already finalized and available at `apps/web/assets/tokens/chester_toke_ship.png`
- A2: The backend already has an entity update mechanism; adding a PATCH endpoint for hex position follows the same pattern
- A3: The existing SSE stream (`/api/stream/referee` and `/api/stream/player`) will automatically include the updated entity position after the database write — no additional push mechanism is needed
- A4: Only one player ship entity exists per campaign at any time
- A5: The hex grid bounds (cols 1–32, rows 1–40) are enforced by the coordinate conversion logic already in the frontend

---

## Dependencies

- Existing `Entity` type with `hex: HexCoord` field
- Existing real-time SSE stream for entity state propagation
- Existing hex coordinate conversion utilities (`pixelToHex`, `hexToLatLng`)
- Existing role system (`referee` / `player`) passed to map components
