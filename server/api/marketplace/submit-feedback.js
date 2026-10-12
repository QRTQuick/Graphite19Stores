import { createMarketplaceAdmin, getPaymentUser } from '../_lib/marketplacePayments.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Please sign in to leave feedback.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Feedback is temporarily unavailable.' })
  const { orderId, sellerId, rating, comment = '' } = request.body || {}
  if (!/^[0-9a-f-]{36}$/i.test(orderId || '') || !/^[0-9a-f-]{36}$/i.test(sellerId || '') || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.length > 2000) return response.status(400).json({ error: 'Check your feedback and try again.' })
  const { data: order, error: orderError } = await admin.from('marketplace_orders').select('id').eq('id', orderId).eq('buyer_id', user.id).eq('payment_status', 'paid').maybeSingle()
  if (orderError || !order) return response.status(403).json({ error: 'Feedback is available after a confirmed purchase.' })
  const { data: line, error: lineError } = await admin.from('marketplace_order_items').select('id').eq('order_id', orderId).eq('seller_id', sellerId).limit(1).maybeSingle()
  if (lineError || !line) return response.status(403).json({ error: 'That seller is not part of this order.' })
  const { error } = await admin.from('marketplace_seller_feedback').insert({ order_id: orderId, seller_id: sellerId, buyer_id: user.id, rating, comment: comment.trim() })
  if (error) return response.status(error.code === '23505' ? 409 : 503).json({ error: error.code === '23505' ? 'Feedback was already sent for this store and order.' : 'We could not save your feedback.' })
  if (rating <= 2) {
    await admin.from('marketplace_sellers').update({ review_required: true, review_reason: 'buyer_feedback', review_started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', sellerId).eq('status', 'approved')
  }
  return response.status(201).json({ success: true })
}
