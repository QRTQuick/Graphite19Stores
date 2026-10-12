import { createMarketplaceAdmin, getPaymentUser } from '../_lib/marketplacePayments.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Please sign in to view your orders.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Order history is not configured yet.' })
  const { data, error } = await admin.from('marketplace_orders')
    .select('id,order_reference,currency,total,payment_status,fulfillment_status,created_at,marketplace_order_items(id,seller_id,item_title,category,quantity,unit_price,currency)')
    .eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return response.status(503).json({ error: 'We could not load your orders.' })
  const orderIds = (data || []).map((order) => order.id)
  const { data: feedback, error: feedbackError } = orderIds.length
    ? await admin.from('marketplace_seller_feedback').select('order_id,seller_id,rating,comment,status').in('order_id', orderIds)
    : { data: [], error: null }
  if (feedbackError) return response.status(503).json({ error: 'We could not load your order feedback.' })
  const feedbackMap = new Map((feedback || []).map((entry) => [`${entry.order_id}:${entry.seller_id}`, entry]))
  for (const order of data || []) for (const item of order.marketplace_order_items || []) item.feedback = feedbackMap.get(`${order.id}:${item.seller_id}`) || null
  return response.status(200).json({ orders: data || [] })
}
