import { createMarketplaceAdmin, getPaymentUser } from '../_lib/marketplacePayments.js'

function requestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  try { return JSON.parse(request.body || '{}') } catch { return {} }
}

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Please sign in to update an order.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Order updates are not configured.' })
  const { orderId = '', nextStatus = '' } = requestBody(request)
  if (!/^[0-9a-f-]{36}$/i.test(String(orderId)) || !['processing', 'shipped', 'delivered'].includes(nextStatus)) {
    return response.status(400).json({ error: 'The order update is invalid.' })
  }
  const { data: items } = await admin.from('marketplace_order_items').select('id').eq('order_id', orderId).eq('seller_id', user.id).limit(1)
  if (!items?.length) return response.status(404).json({ error: 'We could not find an order for your store.' })
  const { data: order, error } = await admin.from('marketplace_orders').select('id,payment_status,fulfillment_status').eq('id', orderId).maybeSingle()
  if (error || !order || order.payment_status !== 'paid') return response.status(409).json({ error: 'Only paid orders can be updated.' })
  const allowedNext = { pending: 'processing', processing: 'shipped', shipped: 'delivered' }
  if (allowedNext[order.fulfillment_status] !== nextStatus) return response.status(409).json({ error: 'This order cannot move to that status.' })
  const { data: updated, error: updateError } = await admin.from('marketplace_orders').update({ fulfillment_status: nextStatus, updated_at: new Date().toISOString() }).eq('id', orderId).eq('fulfillment_status', order.fulfillment_status).select('id').maybeSingle()
  if (updateError) return response.status(503).json({ error: 'We could not update this order.' })
  if (!updated) return response.status(409).json({ error: 'This order was updated in another session. Refresh to see the latest status.' })
  return response.status(200).json({ success: true, fulfillment_status: nextStatus })
}
