export function getRequestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body) } catch { return {} }
  }
  return {}
}

export function getGoogleMapsKey(environment = globalThis.process?.env || {}) {
  return environment.GOOGLE_MAPS_API_KEY || ''
}

export function getAddressComponents(components = []) {
  const find = (...types) => components.find((component) => types.some((type) => component.types?.includes(type)))
  const number = find('street_number')?.longText || ''
  const street = find('route')?.longText || ''
  const unit = find('subpremise')?.longText || ''
  const city = find('locality', 'postal_town', 'sublocality_level_1', 'sublocality')?.longText || ''
  const region = find('administrative_area_level_1')?.longText || ''
  const country = find('country')
  return {
    address: [number, street].filter(Boolean).join(' ').trim(),
    unit,
    city,
    region,
    postalCode: find('postal_code')?.longText || '',
    country: country?.longText || '',
    countryCode: country?.shortText?.toUpperCase() || '',
  }
}
