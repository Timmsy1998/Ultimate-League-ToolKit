import type { GameflowPhase } from '../../../shared/lcu-types'

export const PHASE_LABELS: Partial<Record<GameflowPhase, string>> = {
  None: 'Idle',
  Lobby: 'In a lobby',
  Matchmaking: 'Searching for a match',
  ReadyCheck: 'Ready check',
  ChampSelect: 'Champion select',
  GameStart: 'Starting game',
  InProgress: 'In game',
  Reconnect: 'Reconnecting',
  WaitingForStats: 'Waiting for stats',
  PreEndOfGame: 'Post-game',
  EndOfGame: 'Post-game',
  TerminatedInError: 'Something went wrong',
  FailedToLaunch: 'Failed to launch',
  CheckedIntoTournament: 'Checked into tournament'
}
