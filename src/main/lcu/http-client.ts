import https from 'node:https'
import type { LcuCredentials } from '../../shared/lcu-types'

export interface LcuBufferResponse {
  buffer: Buffer
  contentType: string
}

type Method = 'GET' | 'POST' | 'PUT'

export class LcuHttpClient {
  private readonly agent: https.Agent
  private readonly authHeader: string
  private readonly port: number

  constructor(credentials: LcuCredentials) {
    // The LCU serves a self-signed certificate on 127.0.0.1 by design —
    // every LCU tool has to relax verification to talk to it. This agent
    // instance is scoped to this one client/port only, never applied
    // globally to the app's other network requests.
    this.agent = new https.Agent({ rejectUnauthorized: false })
    this.authHeader = `Basic ${Buffer.from(`riot:${credentials.password}`).toString('base64')}`
    this.port = credentials.port
  }

  get<T>(path: string): Promise<T> {
    return this.requestJson<T>('GET', path)
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>('POST', path, body)
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>('PUT', path, body)
  }

  // For plugin-resource assets (champion/perk icons) — the response isn't
  // JSON, so this resolves the raw bytes plus content-type instead.
  getBuffer(path: string): Promise<LcuBufferResponse> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: '127.0.0.1',
          port: this.port,
          path,
          method: 'GET',
          agent: this.agent,
          headers: { Authorization: this.authHeader }
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            if (!res.statusCode || res.statusCode >= 400) {
              reject(new Error(`LCU request failed: GET ${path} -> ${res.statusCode}`))
              return
            }
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: res.headers['content-type'] ?? 'application/octet-stream'
            })
          })
        }
      )
      req.on('error', reject)
      req.end()
    })
  }

  private requestJson<T>(method: Method, path: string, body?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body), 'utf-8')

      const req = https.request(
        {
          host: '127.0.0.1',
          port: this.port,
          path,
          method,
          agent: this.agent,
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {})
          }
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const responseBody = Buffer.concat(chunks).toString('utf-8')
            if (!res.statusCode || res.statusCode >= 400) {
              reject(new Error(`LCU request failed: ${method} ${path} -> ${res.statusCode}: ${responseBody}`))
              return
            }
            try {
              resolve(responseBody ? (JSON.parse(responseBody) as T) : (undefined as T))
            } catch (err) {
              reject(err)
            }
          })
        }
      )
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  }
}
