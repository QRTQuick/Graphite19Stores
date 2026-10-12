import { createMarketplaceAdmin, getPaymentUser } from './marketplacePayments.js'

export async function requireMarketplaceAdmin(request, environment) {
  const user = await getPaymentUser(request, environment)
  if (!user) return { response: { status: 401, body: { error: 'Please sign in to continue.' } } }
  if (String(user.email || '').toLowerCase() !== 'graphite19stores@gmail.com') {
    return { response: { status: 403, body: { error: 'You do not have access to this page.' } } }
  }
  const admin = createMarketplaceAdmin(environment)
  if (!admin) return { response: { status: 503, body: { error: 'The admin service is not configured yet.' } } }
  return { user, admin }
}

export function sendAdminError(response, result) {
  return response.status(result.status).json(result.body)
}
