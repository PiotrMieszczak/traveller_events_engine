interface TokenProps {
  size?: number
  color?: string
  label?: string
}

export function FreighterToken({ size = 24, color = '#00aaff', label }: TokenProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {/* Freighter: rectangular hull with engine pods */}
      <rect x="4" y="8" width="16" height="8" fill={color} rx="1" />
      <rect x="2" y="10" width="4" height="4" fill={color} opacity="0.7" />
      <rect x="18" y="10" width="4" height="4" fill={color} opacity="0.7" />
      <polygon points="4,8 8,4 16,4 20,8" fill={color} opacity="0.5" />
      {label && (
        <text
          x="12"
          y="22"
          textAnchor="middle"
          fill="white"
          fontSize="4"
          fontFamily="monospace"
        >
          {label}
        </text>
      )}
    </svg>
  )
}
