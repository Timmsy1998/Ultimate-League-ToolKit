import type { LcuHttpClient } from './http-client'

// The renderer can't reach the LCU's own https port directly (self-signed
// cert, and the production CSP's connect-src is 'self' only), so icons get
// proxied through main and handed over as data URIs instead.
export async function fetchAssetDataUri(client: LcuHttpClient, path: string): Promise<string> {
  const { buffer, contentType } = await client.getBuffer(path)
  return `data:${contentType};base64,${buffer.toString('base64')}`
}
