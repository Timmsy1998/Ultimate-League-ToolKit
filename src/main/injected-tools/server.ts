import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { LcuConnectionManager } from '../lcu/connection-manager'
import { isDisenchantRequest, isInviteFriendsRequest } from '../lcu/validate'
import { readSettings } from '../settings/store'
import { logLine } from '../client-theme/logger'
import { getOrCreateToolsToken } from './token-store'

// Loopback-only bridge so the injected in-client panel (CLAUDE.md §5b) can
// call the exact same, already-reviewed LcuConnectionManager methods the
// Tools page uses — never a second implementation of the LCU calls living
// in the injected JS itself. Bound to 127.0.0.1 only, per CLAUDE.md §2/§3;
// never 0.0.0.0.
export const TOOLS_SERVER_PORT = 58452
const MAX_BODY_BYTES = 16 * 1024

let server: Server | null = null

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(payload)
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

// The bearer token — generated once and persisted, never reachable from a
// remote page — is the real authorization boundary here, not the CORS
// headers below. The request's Origin is reflected back (rather than
// pinned to one exact value) because LeagueClientUx's own internal origin
// for plugin pages isn't documented and may vary by client version; that's
// safe specifically because a page that doesn't already know the token
// still can't produce a request this server will act on.
function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin
  if (typeof origin === 'string') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

async function isAuthorized(req: IncomingMessage): Promise<boolean> {
  const header = req.headers.authorization
  if (typeof header !== 'string') return false
  const token = await getOrCreateToolsToken()
  return header === `Bearer ${token}`
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  lcuManager: LcuConnectionManager
): Promise<void> {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const settings = await readSettings()
  if (!settings.injectedToolsEnabled) {
    sendJson(res, 403, { error: 'In-client tools are disabled' })
    return
  }

  if (!(await isAuthorized(req))) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return
  }

  try {
    if (req.method === 'GET' && req.url === '/status') {
      const snapshot = lcuManager.getSnapshot()
      sendJson(res, 200, { status: snapshot.status, phase: snapshot.phase })
      return
    }

    if (req.method === 'POST' && req.url === '/leave-lobby') {
      await lcuManager.leaveLobby()
      sendJson(res, 200, { ok: true })
      return
    }

    // Only ever called right after a dodge's own /leave-lobby succeeds
    // (see tools-builder.ts) — the client's champ-select UI otherwise
    // lingers on stale gameflow state for a moment after leaving, so this
    // forces the same reload client-theme's own apply flow already uses
    // elsewhere to clear it immediately.
    if (req.method === 'POST' && req.url === '/restart-client') {
      await lcuManager.restartClientUx()
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && req.url === '/friends') {
      const [friends, groups] = await Promise.all([lcuManager.getFriends(), lcuManager.getFriendGroups()])
      sendJson(res, 200, { friends, groups })
      return
    }

    if (req.method === 'POST' && req.url === '/invite-friends') {
      const body = await readJsonBody(req)
      if (!isInviteFriendsRequest(body)) {
        sendJson(res, 400, { error: 'Invalid invite request' })
        return
      }
      await lcuManager.inviteFriends(body.summonerIds)
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && req.url === '/loot') {
      const loot = await lcuManager.getLoot()
      sendJson(res, 200, loot)
      return
    }

    if (req.method === 'POST' && req.url === '/disenchant-loot') {
      const body = await readJsonBody(req)
      if (!isDisenchantRequest(body)) {
        sendJson(res, 400, { error: 'Invalid disenchant request' })
        return
      }
      const result = await lcuManager.disenchantLoot(body.recipeName, body.lootIds)
      sendJson(res, 200, result)
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    sendJson(res, 502, { error: err instanceof Error ? err.message : 'League Client request failed' })
  }
}

export function startToolsServer(lcuManager: LcuConnectionManager): void {
  if (server) return

  server = createServer((req, res) => void handleRequest(req, res, lcuManager))
  server.on('error', (error) => {
    void logLine('tools server error', error)
  })
  // 127.0.0.1 explicitly, not 'localhost' (which can also resolve to ::1)
  // and never 0.0.0.0 — this must never be reachable off the local machine.
  server.listen(TOOLS_SERVER_PORT, '127.0.0.1')
}

export function stopToolsServer(): void {
  server?.close()
  server = null
}
