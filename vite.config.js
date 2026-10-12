import { Buffer } from 'node:buffer'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { getPrintifyProducts, PrintifyError } from './api/_lib/printify.js'
import { createSitemap } from './api/_lib/sitemap.js'
import addressSuggestions from './api/address-suggestions.js'
import addressDetails from './api/address-details.js'
import createMarketplacePayment from './api/payments/create-marketplace.js'
import verifyMarketplacePayment from './api/payments/verify-marketplace.js'
import flutterwaveWebhook from './api/payments/flutterwave-webhook.js'
import marketplacePaymentStatus from './api/payments/marketplace-status.js'
import myMarketplaceOrders from './api/payments/my-orders.js'
import sellerMarketplaceOrders from './api/payments/seller-orders.js'
import updateMarketplaceFulfillment from './api/payments/update-fulfillment.js'
import marketplaceAdmin from './api/admin/marketplace.js'
import marketplaceAdminAction from './api/admin/marketplace-action.js'
import createMarketplaceListing from './api/marketplace/create-listing.js'
import submitMarketplaceFeedback from './api/marketplace/submit-feedback.js'

function printifyDevApi(env) {
  return {
    name: 'graphite19-printify-dev-api',
    configureServer(server) {
      server.middlewares.use('/sitemap.xml', async (request, response) => {
        response.setHeader('Content-Type', 'application/xml; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end('Method not allowed.')
          return
        }
        let products = []
        try {
          products = await getPrintifyProducts(env.PRINTIFY_API_KEY, env.PRINTIFY_SHOP_ID, { maxPages: 1, timeoutMs: 5000 })
        } catch {
          // Keep the public-page sitemap available when Printify is offline.
        }
        response.statusCode = 200
        response.end(createSitemap(products))
      })
      server.middlewares.use('/api/products', async (request, response) => {
        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        try {
          const products = await getPrintifyProducts(env.PRINTIFY_API_KEY, env.PRINTIFY_SHOP_ID)
          response.statusCode = 200
          response.end(JSON.stringify(products))
        } catch (error) {
          response.statusCode = error instanceof PrintifyError ? error.status : 502
          response.end(JSON.stringify({ error: error instanceof PrintifyError ? error.message : 'Printify is temporarily unavailable.' }))
        }
      })
      const addressHandlers = new Map([
        ['/address-suggestions', addressSuggestions],
        ['/address-details', addressDetails],
      ])
      const paymentHandlers = new Map([
        ['/payments/create-marketplace', createMarketplacePayment],
        ['/payments/verify-marketplace', verifyMarketplacePayment],
        ['/payments/flutterwave-webhook', flutterwaveWebhook],
        ['/payments/marketplace-status', marketplacePaymentStatus],
        ['/payments/my-orders', myMarketplaceOrders],
        ['/payments/seller-orders', sellerMarketplaceOrders],
        ['/payments/update-fulfillment', updateMarketplaceFulfillment],
      ])
      const marketplaceHandlers = new Map([
        ['/admin/marketplace', marketplaceAdmin],
        ['/admin/marketplace-action', marketplaceAdminAction],
        ['/marketplace/create-listing', createMarketplaceListing],
        ['/marketplace/submit-feedback', submitMarketplaceFeedback],
      ])
      server.middlewares.use('/api', async (request, response, next) => {
        const pathname = request.url?.split('?')[0] || ''
        const handler = addressHandlers.get(pathname) || paymentHandlers.get(pathname) || marketplaceHandlers.get(pathname)
        if (!handler) return next()

        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        try { request.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { request.body = {} }

        let statusCode = 200
        let ended = false
        const headers = {}
        const apiResponse = {
          setHeader(name, value) { headers[name] = value; return this },
          status(code) { statusCode = code; return this },
          json(payload) {
            if (ended) return this
            ended = true
            response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
            response.end(JSON.stringify(payload))
            return this
          },
        }
        try {
          await handler(request, apiResponse, env)
          if (!ended) apiResponse.status(500).json({ error: 'The requested service is temporarily unavailable.' })
        } catch {
          if (!ended) apiResponse.status(500).json({ error: 'The requested service is temporarily unavailable.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    // Serve and generate CSS/JS asset URLs from the deployed site's root.
    // The production host should publish the generated dist/ directory.
    base: '/',
    plugins: [react(), printifyDevApi(env)],
  }
})
