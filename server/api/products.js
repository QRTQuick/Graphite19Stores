import { getPrintifyProducts, PrintifyError } from './_lib/printify.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })

  try {
    const products = await getPrintifyProducts(globalThis.process.env.PRINTIFY_API_KEY, globalThis.process.env.PRINTIFY_SHOP_ID)
    return response.status(200).json(products)
  } catch (error) {
    const status = error instanceof PrintifyError ? error.status : 502
    return response.status(status).json({ error: error instanceof PrintifyError ? error.message : 'Printify is temporarily unavailable.' })
  }
}
