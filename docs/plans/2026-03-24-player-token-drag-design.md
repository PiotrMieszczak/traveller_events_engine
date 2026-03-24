# Design: Player Token PNG + Draggable Positioning

**Date:** 2026-03-24
**Feature:** Replace SVG player token with PNG, enable referee drag-to-move with hex snapping and persistence.

---

## Approach

Replace the SVG `PlayerToken` component in `EntityLayer` with the PNG `chester_toke_ship.png` rendered as an `<img>` inside a Leaflet `divIcon`. Add a Leaflet draggable marker for `player_ship` entities when the role is `referee`. On drag end: snap to nearest hex center, play a pulse animation, and PATCH the new position to the FastAPI backend.

## Rationale

- PNG already exists (`apps/web/assets/tokens/chester_toke_ship.png`) — no design work needed
- Leaflet's built-in `draggable` marker is the simplest drag solution for CRS.Simple maps
- Backend SSE stream handles state propagation to all clients automatically — no extra pub/sub needed
- Referee-only dragging matches the existing two-role permission model

## Alternatives Considered

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| Click-to-select + "Move here" panel | No accidental drags | Extra UI, slower UX | Too many clicks for a frequent operation |
| Click token → click destination | Familiar pattern | Requires selection state management | More code, no clear benefit |
| localStorage save | No backend needed | Lost on other clients, not persisted | Tech debt, defeats the point |

---

## Data Flow

```
Referee drags token
  → dragend fires
  → pixelToHex() converts LatLng → hex string
  → marker snaps to hex center (setLatLng)
  → pulse animation plays (600ms CSS)
  → PATCH /api/entities/{id} { hex: {col, row} }
    → FastAPI updates SQLite
    → SSE stream pushes updated entity list to all clients
    → useGameState receives state_update
    → EntityLayer re-renders with new position
```

---

## Files to Touch

| File | Change |
|------|--------|
| `apps/web/public/tokens/chester_toke_ship.png` | Copy PNG from assets → public (Next.js static serving) |
| `apps/web/components/TravellerMap/EntityLayer.tsx` | PNG icon for player_ship, draggable marker, dragend handler |
| `apps/web/components/TravellerMap/EntityLayer.module.css` | `tokenPulse` keyframe animation |
| `apps/web/components/TravellerMap/TravellerMap.tsx` | Pass `role` prop down to EntityLayer |
| `apps/api/routers/entities.py` | New file: `PATCH /api/entities/{id}` endpoint |
| `apps/api/main.py` | Register entities router |

---

## Key Implementation Details

### PNG Token (EntityLayer)

```tsx
if (entity.entityType === 'player_ship') {
  return `<img src="/tokens/chester_toke_ship.png" width="40" height="40"
    style="filter: drop-shadow(0 0 4px #00ff88); pointer-events: none;" />`
}
```

PNG must be in `apps/web/public/tokens/` for Next.js static serving.

### Draggable Marker

```tsx
<Marker
  draggable={role === 'referee' && entity.entityType === 'player_ship'}
  eventHandlers={{
    dragend: (e) => {
      const { lat, lng } = e.target.getLatLng()
      const hexStr = pixelToHex(lng, SECTOR_H - lat)
      const col = parseInt(hexStr.slice(0, 2), 10)
      const row = parseInt(hexStr.slice(2, 4), 10)
      e.target.setLatLng(hexToLatLng(col, row))  // snap
      // pulse
      const el = e.target.getElement()
      el?.classList.add('tokenPulse')
      setTimeout(() => el?.classList.remove('tokenPulse'), 600)
      // save
      fetch(`/api/entities/${entity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hex: { col, row } }),
      })
    }
  }}
/>
```

### Pulse Animation

```css
@keyframes tokenPulse {
  0%   { transform: scale(1); filter: drop-shadow(0 0 4px #00ff88); }
  40%  { transform: scale(1.3); filter: drop-shadow(0 0 12px #00ff88); }
  100% { transform: scale(1); filter: drop-shadow(0 0 4px #00ff88); }
}
```

Note: Leaflet manages the icon DOM element directly — the pulse class must be a global CSS class (not a CSS Module), applied via `e.target.getElement()`.

### FastAPI PATCH Endpoint

```python
# apps/api/routers/entities.py
@router.patch("/{entity_id}")
async def update_entity_position(
    entity_id: str,
    body: HexUpdate,
    session: AsyncSession = Depends(get_session)
):
    entity = await session.get(EntityModel, entity_id)
    if not entity:
        raise HTTPException(404)
    entity.hex_col = body.hex.col
    entity.hex_row = body.hex.row
    await session.commit()
    return {"status": "ok"}
```

---

## Out of Scope (YAGNI)

- Drag for non-player entities
- Player role dragging
- Undo / redo
- Collision detection
- Optimistic UI updates (SSE handles propagation)
