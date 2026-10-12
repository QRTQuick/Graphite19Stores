import { requireMarketplaceAdmin, sendAdminError } from '../_lib/marketplaceAdmin.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const access = await requireMarketplaceAdmin(request, environment)
  if (access.response) return sendAdminError(response, access.response)
  const { admin } = access
  const [sellers, listings, feedback] = await Promise.all([
    admin.from('marketplace_sellers').select('user_id,store_name,description,country_code,region,status,review_required,review_reason,review_started_at,created_at').or('status.eq.pending,review_required.eq.true').order('created_at', { ascending: true }).limit(200),
    admin.from('marketplace_listings').select('id,seller_id,category,brand,title,description,price,currency,condition,image_url,country_code,region,city,status,review_reason,created_at,seller:marketplace_sellers(store_name)').eq('status', 'pending').order('created_at', { ascending: true }).limit(200),
    admin.from('marketplace_seller_feedback').select('id,order_id,seller_id,buyer_id,rating,comment,status,created_at,seller:marketplace_sellers(store_name)').eq('status', 'open').order('created_at', { ascending: true }).limit(200),
  ])
  if (sellers.error || listings.error || feedback.error) return response.status(503).json({ error: 'We could not load the review queue. Apply the latest marketplace migration and try again.' })
  return response.status(200).json({ sellers: sellers.data || [], listings: listings.data || [], feedback: feedback.data || [] })
}
