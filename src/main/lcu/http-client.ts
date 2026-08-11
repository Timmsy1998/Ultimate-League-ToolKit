import https from 'node:https'
import type { LcuCredentials } from '../../shared/lcu-types'

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
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: '127.0.0.1',
          port: this.port,
          path,
          method: 'GET',
          agent: this.agent,
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json'
          }
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8')
            if (!res.statusCode || res.statusCode >= 400) {
              reject(new Error(`LCU request failed: GET ${path} -> ${res.statusCode}`))
              return
            }
            try {
              resolve(body ? (JSON.parse(body) as T) : (undefined as T))
            } catch (err) {
              reject(err)
            }
          })
        }
      )
      req.on('error', reject)
      req.end()
    })
  }
}
