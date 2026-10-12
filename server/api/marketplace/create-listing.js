import { createMarketplaceAdmin, getPaymentUser } from '../_lib/marketplacePayments.js'

const categories = ['clothes', 'cars', 'pcs', 'watches', 'other']
const conditions = ['new', 'used_like_new', 'used_good', 'used_fair']
const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Please sign in to submit a listing.' })
  const admin = createMarketplaceAdmin(env)
  if (!admin) return response.status(503).json({ error: 'Listing submission is temporarily unavailable.' })
  const input = request.body || {}
  const valid = categories.includes(input.category) && conditions.includes(input.condition)
    && text(input.brand || 'Unbranded', 1, 100) && text(input.title, 3, 160)
    && text(input.description, 10, 10000) && Number.isFinite(Number(input.price)) && Number(input.price) > 0
    && ['NGN', 'USD'].includes(input.currency) && /^https:\/\//i.test(input.image_url || '')
    && text(input.image_url, 9, 2048) && /^[A-Z]{2}$/.test(input.country_code || '')
    && text(input.region, 1, 120) && text(input.city, 1, 120)
    && input.attributes && typeof input.attributes === 'object' && !Array.isArray(input.attributes)
  if (!valid) return response.status(400).json({ error: 'Check the listing details and try again.' })

  const { data: seller, error: sellerError } = await admin.from('marketplace_sellers').select('status,review_required').eq('user_id', user.id).maybeSingle()
  if (sellerError) return response.status(503).json({ error: 'We could not check your seller account.' })
  if (seller?.status !== 'approved' || seller.review_required) return response.status(403).json({ error: 'Your seller store must be approved and clear of review before adding listings.' })

  let reviewReason = ''
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sales = await admin.from('marketplace_order_items').select('quantity,marketplace_orders!inner(payment_status,created_at)').eq('seller_id', user.id).eq('marketplace_orders.payment_status', 'paid').gte('marketplace_orders.created_at', since).limit(5000)
  if (sales.error) reviewReason = 'sales_check_unavailable'
  else if ((sales.data || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0) >= 10) reviewReason = 'high_sales_volume'

  const comparable = await admin.from('marketplace_listings').select('price,seller:marketplace_sellers!inner(status,review_required)').eq('category', input.category).eq('currency', input.currency).eq('status', 'active').eq('seller.status', 'approved').eq('seller.review_required', false).limit(501)
  if (comparable.error) reviewReason ||= 'price_check_unavailable'
  else {
    const prices = (comparable.data || []).map((item) => Number(item.price)).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b)
    if (prices.length >= 5) {
      const median = prices.length % 2 ? prices[Math.floor(prices.length / 2)] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      if (Number(input.price) > median * 2) reviewReason ||= 'high_price'
    }
  }

  const { data, error } = await admin.rpc('submit_marketplace_listing', {
    p_seller_id: user.id,
    p_listing: { ...input, brand: String(input.brand || '').trim() || 'Unbranded', price: Number(input.price) },
    p_review_reason: reviewReason || null,
  })
  if (error) {
    if (error.code === '23514' && error.message?.includes('listing_limit_reached')) return response.status(409).json({ error: 'Your store can have up to five active or under-review listings at a time.' })
    if (error.code === '42501') return response.status(403).json({ error: 'Your seller store must be approved and clear of review before adding listings.' })
    return response.status(503).json({ error: 'We could not submit the listing. Please try again later.' })
  }
  const listing = Array.isArray(data) ? data[0] : data
  return response.status(201).json({ listing, status: listing?.status, review_reason: listing?.review_reason })
}
