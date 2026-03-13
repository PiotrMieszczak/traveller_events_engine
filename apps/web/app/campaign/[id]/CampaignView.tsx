'use client'

import dynamic from 'next/dynamic'
import { Box, Text, Badge, Group } from '@mantine/core'
import { useGameState } from '../../../hooks/useGameState'

// SSR must be disabled for Leaflet
const TravellerMap = dynamic(
  () => import('../../../components/TravellerMap'),
  { ssr: false, loading: () => <Box h="100vh" bg="dark.9" /> }
)

interface CampaignViewProps {
  campaignId: string
  role: 'referee' | 'player'
}

export default function CampaignView({ campaignId, role }: CampaignViewProps) {
  const { entities, connected, error } = useGameState(campaignId, role)

  return (
    <Box pos="relative" h="100vh">
      <Group
        pos="absolute"
        top={12}
        left={12}
        style={{ zIndex: 1000 }}
        gap="xs"
      >
        <Badge color={connected ? 'green' : 'red'} variant="dot">
          {connected ? 'Live' : 'Connecting…'}
        </Badge>
        <Badge color="cyan" variant="outline">
          {role.toUpperCase()}
        </Badge>
        <Text size="xs" c="dimmed">
          {entities.length} entities
        </Text>
      </Group>

      {error && (
        <Text
          pos="absolute"
          top={40}
          left={12}
          size="xs"
          c="red"
          style={{ zIndex: 1000 }}
        >
          {error}
        </Text>
      )}

      <TravellerMap entities={entities} />
    </Box>
  )
}
