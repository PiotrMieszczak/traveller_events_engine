import dynamic from 'next/dynamic'
import { Box } from '@mantine/core'

// SSR must be disabled — Leaflet requires window/document
const TravellerMap = dynamic(
  () => import('../components/TravellerMap'),
  { ssr: false, loading: () => <Box h="100vh" bg="dark.9" /> }
)

export default function HomePage() {
  return <TravellerMap />
}
