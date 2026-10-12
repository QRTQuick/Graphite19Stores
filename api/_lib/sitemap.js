const siteUrl = 'https://graphite19-stores.vercel.app'

const publicPaths = ['/', '/shop', '/about', '/contact', '/faq', '/privacy', '/terms']

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export function createSitemap(products = []) {
  const productPaths = products
    .filter((product) => product.id !== undefined && product.id !== null)
    .map((product) => `/products/${encodeURIComponent(product.id)}`)
  const locations = [...new Set([...publicPaths, ...productPaths])]
    .map((path) => `    <url><loc>${xmlEscape(`${siteUrl}${path}`)}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`
}

export { siteUrl }
