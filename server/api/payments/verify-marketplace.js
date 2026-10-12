import { createMarketplaceAdmin, getPaymentUser, verifyAndRecordPayment } from '../_lib/marketplacePayments.js'

function requestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  try { return JSON.parse(request.body || '{}') } catch { return {} }
}

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Sign in to view this order.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Order verification is not configured yet.' })
  const { transactionId = '', txRef = '' } = requestBody(request)
  const reference = String(txRef).slice(0, 80)
  if (!/^[0-9]{1,30}$/.test(String(transactionId)) || !/^G19-[0-9a-f-]{36}$/i.test(reference)) {
    return response.status(400).json({ error: 'Payment reference is missing or invalid.' })
  }
  const { data: order } = await admin.from('marketplace_orders').select('id,buyer_id').eq('order_reference', reference).maybeSingle()
  if (!order || order.buyer_id !== user.id) return response.status(404).json({ error: 'We could not find this order.' })
  const result = await verifyAndRecordPayment(admin, String(transactionId), reference, env)
  if (!result.ok) return response.status(402).json({ error: 'We could not confirm this payment. If your account was charged, contact customer care with your payment reference.' })
  return response.status(200).json({ success: true, orderId: result.orderId, needsSupport: result.fulfillmentNeedsReview || false })
}
