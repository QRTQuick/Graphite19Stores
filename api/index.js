import addressDetails from '../server/api/address-details.js'
import addressSuggestions from '../server/api/address-suggestions.js'
import marketplaceAdmin from '../server/api/admin/marketplace.js'
import marketplaceAdminAction from '../server/api/admin/marketplace-action.js'
import createMarketplaceListing from '../server/api/marketplace/create-listing.js'
import submitMarketplaceFeedback from '../server/api/marketplace/submit-feedback.js'
import createMarketplacePayment from '../server/api/payments/create-marketplace.js'
import flutterwaveWebhook from '../server/api/payments/flutterwave-webhook.js'
import marketplacePaymentStatus from '../server/api/payments/marketplace-status.js'
import myMarketplaceOrders from '../server/api/payments/my-orders.js'
import sellerMarketplaceOrders from '../server/api/payments/seller-orders.js'
import updateMarketplaceFulfillment from '../server/api/payments/update-fulfillment.js'
import verifyMarketplacePayment from '../server/api/payments/verify-marketplace.js'
import products from '../server/api/products.js'
import sitemap from '../server/api/sitemap.js'

const routes = new Map([
  ['address-details', addressDetails],
  ['address-suggestions', addressSuggestions],
  ['admin/marketplace', marketplaceAdmin],
  ['admin/marketplace-action', marketplaceAdminAction],
  ['marketplace/create-listing', createMarketplaceListing],
  ['marketplace/submit-feedback', submitMarketplaceFeedback],
  ['payments/create-marketplace', createMarketplacePayment],
  ['payments/flutterwave-webhook', flutterwaveWebhook],
  ['payments/marketplace-status', marketplacePaymentStatus],
  ['payments/my-orders', myMarketplaceOrders],
  ['payments/seller-orders', sellerMarketplaceOrders],
  ['payments/update-fulfillment', updateMarketplaceFulfillment],
  ['payments/verify-marketplace', verifyMarketplacePayment],
  ['products', products],
  ['sitemap', sitemap],
])

export default async function handler(request, response) {
  const url = new URL(request.url || '/', `https://${request.headers?.host || 'localhost'}`)
  const pathname = url.pathname
  const configuredPath = request.query?.path || url.searchParams.get('path')
  const rewrittenPath = Array.isArray(configuredPath) ? configuredPath.join('/') : configuredPath
  const route = String(rewrittenPath || pathname.replace(/^\/api\/?/, '')).replace(/^\//, '').replace(/\/$/, '')
  const endpoint = routes.get(route)
  if (!endpoint) return response.status(404).json({ error: 'API route not found.' })
  return endpoint(request, response, globalThis.process?.env || {})
}
