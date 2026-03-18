'use client'

import classes from './MapLoader.module.css'

export default function MapLoader() {
  return (
    <div className={classes.overlay}>
      <div className={classes.frame}>
        {/* Spaceship SVG — top-down silhouette of a scout/trader */}
        <svg
          className={classes.ship}
          viewBox="0 0 120 180"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Fill layer — clipped version of the same ship, animated upward */}
          <defs>
            <clipPath id="fill-clip">
              <rect className={classes.fillRect} x="0" y="180" width="120" height="180" />
            </clipPath>
          </defs>

          {/* Ship outline */}
          <g className={classes.shipOutline}>
            {/* Main hull */}
            <polygon points="60,4 78,40 84,100 72,140 60,156 48,140 36,100 42,40" />
            {/* Port wing */}
            <polygon points="42,60 10,90 8,120 36,108" />
            {/* Starboard wing */}
            <polygon points="78,60 110,90 112,120 84,108" />
            {/* Engine nacelles port */}
            <rect x="28" y="118" width="14" height="28" rx="3" />
            {/* Engine nacelles starboard */}
            <rect x="78" y="118" width="14" height="28" rx="3" />
            {/* Cockpit */}
            <ellipse cx="60" cy="32" rx="8" ry="12" />
            {/* Hull detail lines */}
            <line x1="60" y1="44" x2="60" y2="140" />
            <line x1="48" y1="72" x2="72" y2="72" />
            <line x1="44" y1="96" x2="76" y2="96" />
          </g>

          {/* Filled version — same shapes, clipped to reveal from bottom */}
          <g className={classes.shipFill} clipPath="url(#fill-clip)">
            <polygon points="60,4 78,40 84,100 72,140 60,156 48,140 36,100 42,40" />
            <polygon points="42,60 10,90 8,120 36,108" />
            <polygon points="78,60 110,90 112,120 84,108" />
            <rect x="28" y="118" width="14" height="28" rx="3" />
            <rect x="78" y="118" width="14" height="28" rx="3" />
            <ellipse cx="60" cy="32" rx="8" ry="12" />
          </g>
        </svg>

        <div className={classes.label}>
          <span className={classes.prefix}>DRINAX//</span>
          <span className={classes.status}>LOADING SECTOR MAP</span>
        </div>

        <div className={classes.scanline} aria-hidden="true" />
      </div>
    </div>
  )
}
