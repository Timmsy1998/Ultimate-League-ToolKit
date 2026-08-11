import { EventEmitter } from 'node:events'
import https from 'node:https'
import WebSocket from 'ws'
import type { LcuCredentials, LcuEvent } from '../../shared/lcu-types'

const SUBSCRIBE_FRAME = JSON.stringify([5, 'OnJsonApiEvent'])

export declare interface LcuEventSocket {
  on(event: 'open', listener: () => void): this
  on(event: 'close', listener: () => void): this
  on(event: 'event', listener: (event: LcuEvent) => void): this
}

export class LcuEventSocket extends EventEmitter {
  private socket: WebSocket | null = null

  constructor(private readonly credentials: LcuCredentials) {
    super()
  }

  connect(): void {
    const authHeader = `Basic ${Buffer.from(`riot:${this.credentials.password}`).toString('base64')}`
    // Same reasoning as LcuHttpClient — scoped to this one local connection.
    const agent = new https.Agent({ rejectUnauthorized: false })

    this.socket = new WebSocket(`wss://127.0.0.1:${this.credentials.port}/`, {
      headers: { Authorization: authHeader },
      agent
    })

    this.socket.on('open', () => {
      this.socket?.send(SUBSCRIBE_FRAME)
      this.emit('open')
    })

    this.socket.on('message', (raw: Buffer) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(raw.toString())
      } catch {
        return
      }
      if (!Array.isArray(parsed) || parsed[0] !== 8) return
      const payload = parsed[2] as LcuEvent | undefined
      if (payload?.uri) this.emit('event', payload)
    })

    this.socket.on('close', () => this.emit('close'))
    this.socket.on('error', () => this.socket?.close())
  }

  close(): void {
    this.socket?.removeAllListeners()
    this.socket?.close()
    this.socket = null
  }
}
