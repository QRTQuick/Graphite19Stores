import { createMarketplaceAdmin, getPaymentSecret } from '../_lib/marketplacePayments.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const env = environment || globalThis.process?.env || {}
  const enabled = env.MARKETPLACE_PAYMENTS_ENABLED === 'true' && Boolean(getPaymentSecret(env)) && Boolean(createMarketplaceAdmin(env))
  return response.status(200).json({ enabled, currency: 'NGN' })
}
