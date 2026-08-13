import type { LcuHttpClient } from './http-client'

export async function leaveLobby(client: LcuHttpClient): Promise<void> {
  await client.delete('/lol-lobby/v2/lobby')
}
