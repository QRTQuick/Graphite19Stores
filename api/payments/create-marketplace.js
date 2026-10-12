import { randomUUID } from 'node:crypto'
import { createMarketplaceAdmin, getPaymentSecret, getPaymentUser } from '../_lib/marketplacePayments.js'

function requestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  try { return JSON.parse(request.body || '{}') } catch { return {} }
}

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  if (env.MARKETPLACE_PAYMENTS_ENABLED !== 'true') return response.status(503).json({ error: 'Marketplace checkout is not enabled yet.' })
  const user = await getPaymentUser(request, env)
  if (!user) return response.status(401).json({ error: 'Please sign in before checkout.' })
  const admin = createMarketplaceAdmin(env)
  const paymentSecret = getPaymentSecret(env)
  if (!admin || !paymentSecret) return response.status(503).json({ error: 'Marketplace payments are not configured yet.' })

  const { listingId, fullName = '', phone = '', address = '', city = '', region = '', postalCode = '', countryCode = 'NG' } = requestBody(request)
  if (!/^[0-9a-f-]{36}$/i.test(String(listingId || ''))
    || String(fullName).trim().length < 2 || String(fullName).length > 120
    || String(phone).trim().length < 7 || String(phone).length > 40
    || String(address).trim().length < 5 || String(address).length > 250
    || String(city).trim().length < 2 || String(city).length > 120
    || String(region).trim().length < 2 || String(region).length > 120
    || countryCode !== 'NG') {
    return response.status(400).json({ error: 'Enter a complete delivery address in Nigeria to continue.' })
  }
  if (!user.email) return response.status(400).json({ error: 'Add a verified email address to your account before checkout.' })

  const now = new Date()
  await admin.from('marketplace_listings').update({ status: 'active', reserved_until: null, reserved_order_id: null, updated_at: now.toISOString() })
    .eq('status', 'reserved').lt('reserved_until', now.toISOString())
  const { data: listing, error: listingError } = await admin.from('marketplace_listings')
    .select('id,seller_id,title,category,brand,price,currency,status')
    .eq('id', listingId).eq('status', 'active').maybeSingle()
  if (listingError || !listing) return response.status(409).json({ error: 'This listing is no longer available.' })
  if (listing.seller_id === user.id) return response.status(400).json({ error: 'You cannot purchase your own listing.' })
  if (listing.currency !== 'NGN') return response.status(400).json({ error: 'This listing is not priced in NGN and cannot be checked out yet.' })
  const { data: seller } = await admin.from('marketplace_sellers').select('status,checkout_enabled').eq('user_id', listing.seller_id).maybeSingle()
  if (!seller || seller.status !== 'approved' || !seller.checkout_enabled) return response.status(409).json({ error: 'This seller is not cleared for platform checkout yet.' })
  const amount = Number(listing.price)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return response.status(400).json({ error: 'This listing has an invalid price.' })

  const orderReference = `G19-${randomUUID()}`
  const deliveryAddress = { full_name: String(fullName).trim(), phone: String(phone).trim(), address: String(address).trim(), city: String(city).trim(), region: String(region).trim(), postal_code: String(postalCode).trim().slice(0, 24), country_code: 'NG' }
  const { data: order, error: orderError } = await admin.from('marketplace_orders').insert({
    buyer_id: user.id,
    order_reference: orderReference,
    currency: 'NGN',
    subtotal: amount,
    shipping_total: 0,
    total: amount,
    shipping_address: deliveryAddress,
  }).select('id').single()
  if (orderError || !order) return response.status(503).json({ error: 'We could not create your order. Please try again.' })

  const { error: itemError } = await admin.from('marketplace_order_items').insert({
    order_id: order.id, listing_id: listing.id, seller_id: listing.seller_id,
    item_title: listing.title, category: listing.category, quantity: 1, unit_price: amount, currency: 'NGN',
  })
  if (itemError) {
    await admin.from('marketplace_orders').delete().eq('id', order.id)
    return response.status(503).json({ error: 'We could not reserve this listing for checkout.' })
  }

  const reservedUntil = new Date(now.getTime() + 20 * 60 * 1000).toISOString()
  const { data: reserved, error: reserveError } = await admin.from('marketplace_listings')
    .update({ status: 'reserved', reserved_until: reservedUntil, reserved_order_id: order.id, updated_at: now.toISOString() })
    .eq('id', listing.id).eq('status', 'active').select('id').maybeSingle()
  if (reserveError || !reserved) {
    await admin.from('marketplace_orders').update({ payment_status: 'cancelled', fulfillment_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id)
    return response.status(409).json({ error: 'Someone else is checking out this item. Please try another listing.' })
  }

  const appUrl = String(env.APP_BASE_URL || 'https://graphite19-stores.vercel.app').replace(/\/$/, '')
  let paymentResponse
  try {
    paymentResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paymentSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: orderReference,
        amount: amount.toFixed(2),
        currency: 'NGN',
        redirect_url: `${appUrl}/payment/return`,
        customer: { email: user.email, name: deliveryAddress.full_name, phonenumber: deliveryAddress.phone },
        customizations: { title: 'Graphite19Stores Marketplace', description: `${listing.brand || 'Unbranded'} ${listing.title}`.slice(0, 120) },
        meta: { order_id: order.id, listing_id: listing.id },
        configurations: { session_duration: 15, max_retry_attempt: 3 },
      }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    await admin.from('marketplace_orders').update({ payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id)
    await admin.from('marketplace_listings').update({ status: 'active', reserved_until: null, reserved_order_id: null, updated_at: new Date().toISOString() }).eq('id', listing.id).eq('reserved_order_id', order.id)
    return response.status(502).json({ error: 'Flutterwave is temporarily unavailable. No payment was started.' })
  }
  const payment = await paymentResponse.json().catch(() => null)
  if (!paymentResponse.ok || payment?.status !== 'success' || !payment?.data?.link || !String(payment.data.link).startsWith('https://checkout.flutterwave.com/')) {
    await admin.from('marketplace_orders').update({ payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id)
    await admin.from('marketplace_listings').update({ status: 'active', reserved_until: null, reserved_order_id: null, updated_at: new Date().toISOString() }).eq('id', listing.id).eq('reserved_order_id', order.id)
    return response.status(502).json({ error: 'Flutterwave could not start this payment. No payment was started.' })
  }
  return response.status(200).json({ paymentUrl: payment.data.link })
}
