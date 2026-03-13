interface TokenProps {
  size?: number
  color?: string
  label?: string
}

export function PlayerToken({ size = 28, color = '#00ff88', label }: TokenProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      {/* Player ship: distinctive swept-wing arrow design */}
      <polygon points="14,2 22,20 14,16 6,20" fill={color} />
      <polygon points="14,8 18,18 14,15 10,18" fill={color} opacity="0.5" />
      {/* Engine glow */}
      <circle cx="14" cy="20" r="3" fill={color} opacity="0.3" />
      {label && (
        <text x="14" y="27" textAnchor="middle" fill="white" fontSize="4" fontFamily="monospace">
          {label}
        </text>
      )}
    </svg>
  )
}
