import type { GameSessionInfo } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawGameflowSession {
  gameData?: { queue?: { name?: string; gameMode?: string } }
  map?: { name?: string }
}

function isRawGameflowSession(value: unknown): value is RawGameflowSession {
  return !!value && typeof value === 'object'
}

// 404s ("No gameflow session exists") whenever the player is just sitting
// at the main menu — that's the normal/common case, not an error, so it
// resolves to null rather than rejecting.
export async function fetchGameSession(client: LcuHttpClient): Promise<GameSessionInfo | null> {
  try {
    const raw = await client.get<unknown>('/lol-gameflow/v1/session')
    if (!isRawGameflowSession(raw)) return null

    const queueName = raw.gameData?.queue?.name
    if (typeof queueName !== 'string' || queueName.length === 0) return null

    return {
      queueName,
      gameMode: typeof raw.gameData?.queue?.gameMode === 'string' ? raw.gameData.queue.gameMode : '',
      mapName: typeof raw.map?.name === 'string' ? raw.map.name : ''
    }
  } catch {
    return null
  }
}
