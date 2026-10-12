import { getGoogleMapsKey, getRequestBody } from './_lib/googleAddress.js'
import { getAuthenticatedUser } from './_lib/auth.js'

export default async function handler(request, response, environment) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Address search is unavailable.' })
  if (!await getAuthenticatedUser(request, environment)) return response.status(401).json({ error: 'Please sign in to search delivery addresses.' })
  const { input = '', countryCode = '', sessionToken = '' } = getRequestBody(request)
  const query = String(input).trim()
  if (query.length < 4 || query.length > 200) return response.status(400).json({ error: 'Enter at least four characters to search.' })
  const apiKey = getGoogleMapsKey(environment)
  if (!apiKey) return response.status(503).json({ error: 'Address search is not configured yet.' })

  try {
    const payload = { input: query, languageCode: 'en' }
    if (/^[A-Z]{2}$/i.test(countryCode)) payload.includedRegionCodes = [String(countryCode).toLowerCase()]
    if (/^[\w-]{10,100}$/.test(sessionToken)) payload.sessionToken = sessionToken
    const result = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(7000),
    })
    if (!result.ok) return response.status(502).json({ error: 'Address suggestions are temporarily unavailable.' })
    const data = await result.json()
    const suggestions = (data.suggestions || []).flatMap((entry) => entry.placePrediction ? [{
      placeId: entry.placePrediction.placeId,
      description: entry.placePrediction.text?.text || '',
    }] : [])
    return response.status(200).json({ suggestions })
  } catch {
    return response.status(502).json({ error: 'Address suggestions are temporarily unavailable.' })
  }
}
