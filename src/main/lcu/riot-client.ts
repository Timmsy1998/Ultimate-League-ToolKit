import type { LcuHttpClient } from './http-client'

// Proxied through the same LCU port/credentials as everything else here —
// not a separate Riot Client API connection. Confirmed against the
// community LCU/RiotClient API reference and existing client libraries,
// not guessed (this project has gotten League-client internals wrong from
// assumption before).
export async function restartClientUx(client: LcuHttpClient): Promise<void> {
  await client.post('/riotclient/kill-and-restart-ux', undefined)
}
