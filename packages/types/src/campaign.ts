export interface TravellerDate {
  year: number
  day: number
}

export interface DoomClock {
  pri: number          // Pirate Reputation Index 0–12
  aslanHeat: number    // Aslan ihatei pressure 0–10
  imperiumHeat: number // Imperial Navy response 0–10
}

export interface Campaign {
  id: string
  name: string
  currentTick: number      // in-game weeks elapsed
  currentDate: string      // "YYYY-DDD" Imperial calendar format
  doomClock: DoomClock
}
