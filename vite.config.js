import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { getPrintifyProducts, PrintifyError } from './api/_lib/printify.js'

function printifyDevApi(env) {
  return {
    name: 'graphite19-printify-dev-api',
    configureServer(server) {
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
