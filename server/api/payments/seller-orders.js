import { createMarketplaceAdmin, getPaymentUser } from '../_lib/marketplacePayments.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Please sign in to view seller orders.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Seller order access is not configured.' })
  const { data: seller } = await admin.from('marketplace_sellers').select('status').eq('user_id', user.id).maybeSingle()
  if (!seller || seller.status !== 'approved') return response.status(403).json({ error: 'A reviewed seller account is required.' })
  const { data: items, error: itemError } = await admin.from('marketplace_order_items')
    .select('id,order_id,item_title,category,quantity,unit_price,currency')
    .eq('seller_id', user.id).order('created_at', { ascending: false }).limit(100)
  if (itemError) return response.status(503).json({ error: 'We could not load seller orders.' })
  const ids = [...new Set((items || []).map((item) => item.order_id))]
  if (!ids.length) return response.status(200).json({ orders: [] })
  const { data: orders, error: orderError } = await admin.from('marketplace_orders')
    .select('id,order_reference,payment_status,fulfillment_status,created_at,shipping_address')
    .in('id', ids).eq('payment_status', 'paid').order('created_at', { ascending: false })
  if (orderError) return response.status(503).json({ error: 'We could not load seller orders.' })
  const byId = new Map((orders || []).map((order) => [order.id, order]))
  return response.status(200).json({ orders: (items || []).flatMap((item) => byId.has(item.order_id) ? [{ ...item, order: byId.get(item.order_id) }] : []) })
}
