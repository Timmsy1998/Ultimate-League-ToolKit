import type { GameflowPhase } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

// DELETE /lol-lobby/v2/lobby only ever removed the local lobby object —
// during champ select the matchmaking/draft session stays active
// server-side unless the teambuilder-draft backend is told to quit first,
// which is exactly what sent players straight back into "Finding Match"
// right after a dodge. Two-call sequence grounded in a real, working
// PenguLoader dodge plugin (github.com/Elaina69/Elaina-theme, MIT — see
// src/plugins/dodgeButton.ts), not guessed. Each call is independently
// best-effort (matching the reference) since cancel-champ-select still
// needs to run even if the LCDS quit call fails.
async function quitTeambuilderDraft(client: LcuHttpClient): Promise<void> {
  const args = ['', 'teambuilder-draft', 'quitV2', '']
  try {
    await client.post(
      `/lol-login/v1/session/invoke?destination=lcdsServiceProxy&method=call&args=${encodeURIComponent(JSON.stringify(args))}`,
      args
    )
  } catch {
    // Best-effort — see comment above.
  }
  try {
    await client.post('/lol-lobby/v1/lobby/custom/cancel-champ-select', undefined)
  } catch {
    // Best-effort — see comment above.
  }
}

export async function leaveLobby(client: LcuHttpClient, phase: GameflowPhase): Promise<void> {
  if (phase === 'ChampSelect') {
    await quitTeambuilderDraft(client)
    return
  }
  await client.delete('/lol-lobby/v2/lobby')
}
