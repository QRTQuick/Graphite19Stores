import { requireMarketplaceAdmin, sendAdminError } from '../_lib/marketplaceAdmin.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const access = await requireMarketplaceAdmin(request, environment)
  if (access.response) return sendAdminError(response, access.response)
  const { admin, user } = access
  const { type, id, action } = request.body || {}
  if (!UUID.test(id || '')) return response.status(400).json({ error: 'Choose a valid review item.' })
  const now = new Date().toISOString()
  let result
  if (type === 'seller' && ['approve', 'reject', 'suspend', 'resolve'].includes(action)) {
    const update = action === 'approve'
      ? { status: 'approved', review_required: false, review_reason: null, review_started_at: null, verified_at: now, verified_by: user.email, updated_at: now }
      : action === 'resolve'
        ? { review_required: false, review_reason: null, review_started_at: null, updated_at: now }
        : { status: 'suspended', review_required: action === 'suspend', review_reason: action === 'suspend' ? 'admin_suspended' : null, review_started_at: action === 'suspend' ? now : null, updated_at: now }
    result = await admin.from('marketplace_sellers').update(update).eq('user_id', id).select('user_id').maybeSingle()
  } else if (type === 'listing' && ['approve', 'reject'].includes(action)) {
    result = await admin.from('marketplace_listings').update({ status: action === 'approve' ? 'active' : 'rejected', reviewed_at: now, review_reason: null, updated_at: now }).eq('id', id).eq('status', 'pending').select('id').maybeSingle()
  } else if (type === 'feedback' && action === 'resolve') {
    result = await admin.from('marketplace_seller_feedback').update({ status: 'resolved', resolved_at: now }).eq('id', id).eq('status', 'open').select('seller_id').maybeSingle()
    if (result.data?.seller_id) {
      const { count, error } = await admin.from('marketplace_seller_feedback').select('id', { count: 'exact', head: true }).eq('seller_id', result.data.seller_id).eq('status', 'open')
      if (!error && count === 0) await admin.from('marketplace_sellers').update({ review_required: false, review_reason: null, review_started_at: null, updated_at: now }).eq('user_id', result.data.seller_id).eq('review_reason', 'buyer_feedback')
    }
  } else return response.status(400).json({ error: 'That review action is not available.' })
  if (result.error) return response.status(503).json({ error: 'We could not save that review decision.' })
  if (!result.data) return response.status(404).json({ error: 'That item is no longer in the review queue.' })
  return response.status(200).json({ success: true })
}
