export type EntityType =
  | 'player_ship'
  | 'freighter'
  | 'liner'
  | 'patrol'
  | 'pirate'
  | 'convoy'

export interface HexCoord {
  col: number
  row: number
}

export interface Entity {
  id: string
  campaignId: string
  name: string
  entityType: EntityType
  hex: HexCoord
  tokenSvgId: string
  visibleToPlayers: boolean
}

export interface GameEvent {
  id: string
  campaignId: string
  eventType: string
  tick: number
  description: string
  hex?: HexCoord
  visibleToPlayers: boolean
}
