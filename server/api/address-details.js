import { getAddressComponents, getGoogleMapsKey, getRequestBody } from './_lib/googleAddress.js'
import { getAuthenticatedUser } from './_lib/auth.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Address details are unavailable.' })
  if (!await getAuthenticatedUser(request, environment)) return response.status(401).json({ error: 'Please sign in to look up delivery addresses.' })
  const { placeId = '' } = getRequestBody(request)
  if (typeof placeId !== 'string' || !/^[\w-]{10,200}$/.test(placeId)) return response.status(400).json({ error: 'Choose an address suggestion to continue.' })
  const apiKey = getGoogleMapsKey(environment)
  if (!apiKey) return response.status(503).json({ error: 'Address lookup is not configured yet.' })

  try {
    const result = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,formattedAddress,addressComponents' },
      signal: AbortSignal.timeout(7000),
    })
    if (!result.ok) return response.status(502).json({ error: 'We couldn’t load that address. Please choose another suggestion.' })
    const place = await result.json()
    return response.status(200).json({
      placeId: place.id,
      formattedAddress: place.formattedAddress || '',
      ...getAddressComponents(place.addressComponents),
    })
  } catch {
    return response.status(502).json({ error: 'We couldn’t load that address. Please choose another suggestion.' })
  }
}
