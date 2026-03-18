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
  'Green (Safe)':    classes.zoneGreen,
  'Amber (Caution)': classes.zoneAmber,
  'Red (Restricted)': classes.zoneRed,
}

// UWP position labels — 9 chars: Port Size Atm Hyd Pop Gov Law - TL
const UWP_LABELS = ['Port', 'Size', 'Atm', 'Hyd', 'Pop', 'Gov', 'Law', '', 'TL']

function UWPStrip({ raw }: { raw: string }) {
  const chars = raw.split('')
  return (
    <div className={classes.uwpStrip}>
      {chars.map((ch, i) =>
        ch === '-' ? (
          <span key={i} className={classes.uwpDash}>—</span>
        ) : (
          <div key={i} className={classes.uwpCell}>
            <span className={classes.uwpChar}>{ch}</span>
            <span className={classes.uwpLabel}>{UWP_LABELS[i] ?? ''}</span>
          </div>
        )
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={classes.section}>
      <div className={classes.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className={classes.grid}>{children}</div>
}

function Cell({ label, value, accent, dim, full }: {
  label: string
  value: string | number
  accent?: boolean
  dim?: boolean
  full?: boolean
}) {
  const valueClass = [
    classes.cellValue,
    accent ? classes.accent : '',
    dim ? classes.dim : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`${classes.cell}${full ? ` ${classes.full}` : ''}`}>
      <div className={classes.cellLabel}>{label}</div>
      <div className={valueClass}>{value}</div>
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
      {/* ── Sticky header ── */}
      <div className={classes.header}>
        <span className={classes.hexCode}>System {hex}</span>
        <button className={classes.close} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* ── Loading ── */}
      {state.status === 'loading' && (
        <div className={classes.loading}>
          <span className={classes.loadingDot} />
          <span className={classes.loadingDot} />
          <span className={classes.loadingDot} />
        </div>
      )}

      {/* ── Empty hex ── */}
      {state.status === 'empty' && (
        <div className={classes.empty}>
          <span className={classes.emptyGlyph}>⬡</span>
          <span>Deep space — no world in this hex</span>
        </div>
      )}

      {/* ── Error ── */}
      {state.status === 'error' && (
        <div className={classes.empty}>
          <span className={classes.emptyGlyph}>⚠</span>
          <span>Sensor malfunction — data unavailable</span>
        </div>
      )}

      {/* ── World data ── */}
      {state.status === 'loaded' && (() => {
        const { world } = state
        const uwp = world.uwp
        const zoneClass = ZONE_CLASS[world.zone] ?? classes.zoneGreen
        const zoneLabel = world.zone.split(' ')[0].toUpperCase()

        return (
          <>
            {/* Identity */}
            <div className={classes.identity}>
              <div className={classes.worldName}>{world.name}</div>
              <div className={classes.uwpRow}>
                <span className={`${classes.zone} ${zoneClass}`}>{zoneLabel}</span>
                {uwp && <UWPStrip raw={uwp.raw} />}
              </div>
            </div>

            {/* World profile */}
            {uwp && (
              <Section title="World Profile">
                <Grid>
                  <Cell label="Starport"     value={uwp.starport}      accent />
                  <Cell label="Tech Level"   value={`TL-${uwp.techLevel}`} accent />
                  <Cell label="Size"         value={uwp.size}          />
                  <Cell label="Atmosphere"   value={uwp.atmosphere}    />
                  <Cell label="Hydrographics" value={uwp.hydrographics} />
                  <Cell label="Population"   value={uwp.population}    />
                  <Cell label="Government"   value={uwp.government}    full />
                  <Cell label="Law Level"    value={uwp.lawLevel}      full dim />
                </Grid>
              </Section>
            )}

            {/* Trade codes */}
            {world.remarks.length > 0 && (
              <Section title="Trade Codes">
                <div className={classes.tags}>
                  {world.remarks.map((r) => (
                    <span key={r} className={classes.tag}>{r}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* System data */}
            <Section title="System">
              <Grid>
                <Cell label="Stars"        value={world.stars}       full />
                <Cell label="Allegiance"   value={world.allegiance}  />
                <Cell label="Worlds"       value={world.worldCount}  />
                {world.bases && <Cell label="Bases" value={world.bases} full />}
              </Grid>
            </Section>

            {/* Economic */}
            <Section title="Economic">
              <Grid>
                <Cell label="Importance"   value={world.importance}  />
                <Cell label="Res. Units"   value={world.ru}          />
                <Cell label="Economic Ext" value={world.economic}    />
                <Cell label="Cultural Ext" value={world.cultural}    />
              </Grid>
            </Section>

            <div className={classes.spacer} />
          </>
        )
      })()}
    </div>
  )
}
