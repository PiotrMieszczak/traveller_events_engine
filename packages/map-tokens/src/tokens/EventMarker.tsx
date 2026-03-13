interface EventMarkerProps {
  size?: number
  color?: string
  pulse?: boolean
}

export function EventMarker({ size = 20, color = '#ff4444', pulse = true }: EventMarkerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      {pulse && (
        <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="1" opacity="0.4">
          <animate attributeName="r" from="5" to="9" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="10" cy="10" r="5" fill={color} />
      <text x="10" y="14" textAnchor="middle" fill="white" fontSize="8" fontFamily="monospace">!</text>
    </svg>
  )
}
