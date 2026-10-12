import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './auth.js'

const getEnvironment = (environment) => environment || globalThis.process?.env || {}

export function createMarketplaceAdmin(environment) {
  const env = getEnvironment(environment)
  const url = env.VITE_SUPABASE_URL
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secretKey) return null
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
}

export async function verifyAndRecordPayment(admin, transactionId, expectedReference = '', environment) {
  const env = getEnvironment(environment)
  const secretKey = env.FLW_SECRET_KEY
  if (!admin || !secretKey || !transactionId) return { ok: false, reason: 'not_configured' }

  const { data: order, error } = await admin.from('marketplace_orders')
    .select('id,buyer_id,order_reference,currency,total,payment_status')
    .eq('order_reference', expectedReference)
    .maybeSingle()
  if (error || !order) return { ok: false, reason: 'order_not_found' }
  if (order.payment_status === 'paid') return { ok: true, alreadyPaid: true, orderId: order.id }

  let paymentResponse
  try {
    paymentResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(9000),
    })
  } catch {
    return { ok: false, reason: 'verification_unavailable' }
  }
  if (!paymentResponse.ok) return { ok: false, reason: 'verification_unavailable' }
  const payload = await paymentResponse.json()
  const transaction = payload?.data
  const matches = payload?.status === 'success'
    && transaction?.status === 'successful'
    && String(transaction?.tx_ref) === order.order_reference
    && (!expectedReference || expectedReference === order.order_reference)
    && transaction?.currency === 'NGN'
    && Number(transaction?.amount) >= Number(order.total)
  if (!matches) {
    if (transaction?.status === 'failed' || transaction?.status === 'cancelled') {
      await admin.from('marketplace_orders').update({ payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id).eq('payment_status', 'pending')
      await releaseReservedListing(admin, order.id)
    }
    return { ok: false, reason: 'payment_not_verified' }
  }

  const { data: lines } = await admin.from('marketplace_order_items').select('listing_id').eq('order_id', order.id)
  const { data: paidOrder, error: updateError } = await admin.from('marketplace_orders')
    .update({ payment_status: 'paid', flutterwave_transaction_id: String(transaction.id), updated_at: new Date().toISOString() })
    .eq('id', order.id).eq('payment_status', 'pending').select('id').maybeSingle()
  if (updateError) return { ok: false, reason: 'order_update_failed' }
  if (!paidOrder) {
    const { data: latestOrder } = await admin.from('marketplace_orders').select('payment_status').eq('id', order.id).maybeSingle()
    if (latestOrder?.payment_status === 'paid') return { ok: true, alreadyPaid: true, orderId: order.id }
    return { ok: false, reason: 'order_update_failed' }
  }

  let listingFinalized = !lines?.length
  for (const line of lines || []) {
    const { data: sold } = await admin.from('marketplace_listings')
      .update({ status: 'sold', reserved_until: null, reserved_order_id: null, updated_at: new Date().toISOString() })
      .eq('id', line.listing_id).eq('status', 'reserved').eq('reserved_order_id', order.id).select('id').maybeSingle()
    listingFinalized = listingFinalized || Boolean(sold)
  }
  if (!listingFinalized) {
    await admin.from('marketplace_orders').update({ fulfillment_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id)
  }
  return { ok: true, orderId: order.id, fulfillmentNeedsReview: !listingFinalized }
}

async function releaseReservedListing(admin, orderId) {
  const { data: lines } = await admin.from('marketplace_order_items').select('listing_id').eq('order_id', orderId)
  for (const line of lines || []) {
    await admin.from('marketplace_listings')
      .update({ status: 'active', reserved_until: null, reserved_order_id: null, updated_at: new Date().toISOString() })
      .eq('id', line.listing_id).eq('status', 'reserved').eq('reserved_order_id', orderId)
  }
}

export async function getPaymentUser(request, environment) {
  return getAuthenticatedUser(request, getEnvironment(environment))
}

export function getPaymentSecret(environment) {
  return getEnvironment(environment).FLW_SECRET_KEY || ''
}

export function getPaymentWebhookHash(environment) {
  return getEnvironment(environment).FLW_SECRET_HASH || ''
}
