export class PrintifyError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function getPrintifyProducts(apiKey, shopId) {
  if (!apiKey || !shopId) throw new PrintifyError(503, 'Printify is not configured.')

  const products = []
  let page = 1
  let lastPage = 1
  while (page <= lastPage && page <= 20) {
    const result = await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products.json?page=${page}&limit=50`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'Graphite19Stores/1.0' },
    })
    if (!result.ok) {
      const status = result.status === 401 || result.status === 403 ? 502 : result.status
      throw new PrintifyError(status, 'Could not load products from Printify.')
    }
    const payload = await result.json()
    products.push(...(Array.isArray(payload.data) ? payload.data : []))
    lastPage = Number(payload.last_page) || page
    page += 1
  }
  return products.filter((product) => product.visible).map((product) => {
    const image = product.images?.find((item) => item.is_default) || product.images?.[0]
    const variants = (product.variants || []).filter((variant) => variant.is_enabled && variant.is_available !== false).map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: Number(variant.price || 0) / 100,
      is_available: variant.is_available !== false,
    }))
    const category = /tote|print|mug|case|poster|bag|bottle/i.test(`${product.title} ${(product.tags || []).join(' ')}`) ? 'Objects' : 'Apparel'
    return {
      id: String(product.id),
      title: product.title,
      description: product.description || '',
      category,
      price: variants.length ? Math.min(...variants.map((variant) => variant.price)) : 0,
      image: image?.src || '',
      color: product.tags?.[0] || 'Graphite19Stores',
      variants,
    }
  })
}
