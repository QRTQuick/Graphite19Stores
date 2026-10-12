export function getLowestPriceVariant(product) {
  return (product?.variants || [])
    .filter((variant) => Number.isFinite(Number(variant.price)) && Number(variant.price) > 0)
    .reduce((lowest, variant) => !lowest || Number(variant.price) < Number(lowest.price) ? variant : lowest, null)
}

export function hasVariantPriceDifferences(product) {
  const prices = new Set((product?.variants || [])
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .map((price) => price.toFixed(2)))
  return prices.size > 1
}

export function getStartingPrice(product) {
  const lowestVariant = getLowestPriceVariant(product)
  return Number(lowestVariant?.price ?? product?.price ?? 0)
}
