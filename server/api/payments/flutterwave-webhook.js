import { timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { createMarketplaceAdmin, getPaymentWebhookHash, verifyAndRecordPayment } from '../_lib/marketplacePayments.js'

function requestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  try { return JSON.parse(request.body || '{}') } catch { return {} }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && timingSafeEqual(a, b)
}

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const expectedHash = getPaymentWebhookHash(env)
  const suppliedHash = request.headers?.['verif-hash'] || request.headers?.['Verif-Hash'] || ''
  if (!expectedHash || !safeEqual(suppliedHash, expectedHash)) return response.status(401).json({ error: 'Invalid webhook signature.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Webhook is not configured.' })
  const event = requestBody(request)
  const transactionId = String(event?.data?.id || '')
  const txRef = String(event?.data?.tx_ref || '')
  if (!transactionId || !txRef.startsWith('G19-')) return response.status(200).json({ received: true, ignored: true })
  const result = await verifyAndRecordPayment(admin, transactionId, txRef, env)
  if (!result.ok && result.reason === 'verification_unavailable') return response.status(503).json({ error: 'Retry later.' })
  return response.status(200).json({ received: true })
}
