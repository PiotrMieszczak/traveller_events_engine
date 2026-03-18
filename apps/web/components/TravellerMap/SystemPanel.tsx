'use client'

import { useEffect, useState } from 'react'
import type { WorldData } from '../../app/api/world/route'
import classes from './SystemPanel.module.css'

interface SystemPanelProps {
  hex: string | null
  onClose: () => void
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty'; hex: string }
  | { status: 'loaded'; world: WorldData }
  | { status: 'error' }

const ZONE_CLASS: Record<string, string> = {
  'Green (Safe)': classes.zoneGreen,
  'Amber (Caution)': classes.zoneAmber,
  'Red (Restricted)': classes.zoneRed,
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={classes.row}>
      <span className={classes.rowLabel}>{label}</span>
      <span className={classes.rowValue}>{value}</span>
    </div>
  )
}

export default function SystemPanel({ hex, onClose }: SystemPanelProps) {
  const [state, setState] = useState<FetchState>({ status: 'idle' })

  useEffect(() => {
    if (!hex) return
    setState({ status: 'loading' })
    fetch(`/api/world?hex=${hex}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.empty) setState({ status: 'empty', hex })
        else if (data.error) setState({ status: 'error' })
        else setState({ status: 'loaded', world: data as WorldData })
      })
      .catch(() => setState({ status: 'error' }))
  }, [hex])

  if (!hex) return null

  return (
    <div className={classes.panel}>
      <div className={classes.header}>
        <span className={classes.hexCode}>HEX {hex}</span>
        <button className={classes.close} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {state.status === 'loading' && (
        <div className={classes.loading}>
          <span className={classes.loadingDot} />
          <span className={classes.loadingDot} />
          <span className={classes.loadingDot} />
        </div>
      )}

      {state.status === 'empty' && (
        <div className={classes.empty}>
          <span className={classes.emptyGlyph}>⬡</span>
          <span>Deep Space — no world</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className={classes.empty}>Sensor malfunction</div>
      )}

      {state.status === 'loaded' && (() => {
        const { world } = state
        const uwp = world.uwp
        return (
          <>
            <div className={classes.worldName}>{world.name}</div>
            {uwp && (
              <div className={classes.uwpBadge}>
                <span className={`${classes.zone} ${ZONE_CLASS[world.zone] ?? classes.zoneGreen}`}>
                  {world.zone.split(' ')[0].toUpperCase()}
                </span>
                <code className={classes.uwpCode}>{uwp.raw}</code>
              </div>
            )}

            <div className={classes.section}>WORLD PROFILE</div>
            {uwp && <>
              <Row label="Starport" value={uwp.starport} />
              <Row label="Size" value={uwp.size} />
              <Row label="Atmosphere" value={uwp.atmosphere} />
              <Row label="Hydrographics" value={uwp.hydrographics} />
              <Row label="Population" value={uwp.population} />
              <Row label="Government" value={uwp.government} />
              <Row label="Law Level" value={uwp.lawLevel} />
              <Row label="Tech Level" value={`TL-${uwp.techLevel}`} />
            </>}

            {world.remarks.length > 0 && (
              <>
                <div className={classes.section}>TRADE CODES</div>
                <div className={classes.tags}>
                  {world.remarks.map((r) => (
                    <span key={r} className={classes.tag}>{r}</span>
                  ))}
                </div>
              </>
            )}

            <div className={classes.section}>SYSTEM DATA</div>
            <Row label="Stars" value={world.stars} />
            <Row label="Allegiance" value={world.allegiance} />
            {world.bases && <Row label="Bases" value={world.bases} />}
            <Row label="Worlds in system" value={world.worldCount} />

            <div className={classes.section}>ECONOMIC</div>
            <Row label="Importance" value={world.importance} />
            <Row label="Economic" value={world.economic} />
            <Row label="Cultural" value={world.cultural} />
            <Row label="Resource Units" value={world.ru} />
          </>
        )
      })()}

      <div className={classes.scanline} aria-hidden="true" />
    </div>
  )
}
