export class PrintifyError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function toPlainText(value = '') {
  return String(value)
    .replace(/&#x([\da-f]+);/gi, (_, code) => {
      const point = parseInt(code, 16)
      return point <= 0x10ffff ? String.fromCodePoint(point) : ' '
    })
    .replace(/&#(\d+);/g, (_, code) => {
      const point = Number(code)
      return point <= 0x10ffff ? String.fromCodePoint(point) : ' '
    })
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|section|article)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getHexColor(value) {
  const color = value?.colors?.find((item) => /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(item))
  return color || null
}

export async function getPrintifyProducts(apiKey, shopId, { maxPages = 20, timeoutMs = 10000 } = {}) {
  if (!apiKey || !shopId) throw new PrintifyError(503, 'Printify is not configured.')

  const products = []
  let page = 1
  let lastPage = 1
  while (page <= lastPage && page <= Math.min(maxPages, 20)) {
    const result = await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products.json?page=${page}&limit=50`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'Graphite19Stores/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
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
    const options = (product.options || []).map((option) => ({
      name: option.name,
      type: option.type,
      values: (option.values || []).map((value) => ({
        id: String(value.id),
        title: value.title,
        colorHex: getHexColor(value),
      })),
    }))
    const variants = (product.variants || []).filter((variant) => variant.is_enabled && variant.is_available !== false).map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: Number(variant.price || 0) / 100,
      is_available: variant.is_available !== false,
      optionValues: Object.fromEntries(options.map((option, index) => {
        const valueId = String(variant.options?.[index] ?? '')
        const value = option.values.find((item) => item.id === valueId)
        return [option.name, value ? { ...value } : null]
      }).filter(([, value]) => value)),
      image: product.images?.find((item) => item.variant_ids?.some((id) => String(id) === String(variant.id)))?.src || image?.src || '',
    }))
    const colorOption = options.find((option) => option.type === 'color' || /colou?r/i.test(option.name))
    const productColors = colorOption?.values.map((value) => value.title).filter(Boolean) || []
    const category = /tote|print|mug|case|poster|bag|bottle/i.test(`${product.title} ${(product.tags || []).join(' ')}`) ? 'Objects' : 'Apparel'
    return {
      id: String(product.id),
      title: product.title,
      description: toPlainText(product.description),
      category,
      price: variants.length ? Math.min(...variants.map((variant) => variant.price)) : 0,
      image: image?.src || '',
      color: productColors.length ? [...new Set(productColors)].join(', ') : 'Graphite19Stores',
      variantOptions: options,
      colorOptionName: colorOption?.name || null,
      sizeOptionName: options.find((option) => /size/i.test(option.name))?.name || null,
      variants,
    }
  })
}
