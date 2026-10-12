import { createSitemap } from './_lib/sitemap.js'
import { getPrintifyProducts } from './_lib/printify.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
  response.setHeader('Content-Type', 'application/xml; charset=utf-8')
  if (request.method !== 'GET') return response.status(405).send('Method not allowed.')

  let products = []
  try {
    products = await getPrintifyProducts(globalThis.process.env.PRINTIFY_API_KEY, globalThis.process.env.PRINTIFY_SHOP_ID, { maxPages: 1, timeoutMs: 5000 })
  } catch {
    // Keep the public-page sitemap available if the Printify catalog is temporarily offline.
  }

  return response.status(200).send(createSitemap(products))
}
