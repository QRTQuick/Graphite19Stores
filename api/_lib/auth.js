import { createClient } from '@supabase/supabase-js'

export async function getAuthenticatedUser(request, environment = globalThis.process?.env || {}) {
  const authorization = request.headers?.authorization || request.headers?.Authorization || ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  const projectUrl = environment.VITE_SUPABASE_URL
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!token || !projectUrl || !publishableKey) return null

  try {
    const supabase = createClient(projectUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    const { data, error } = await supabase.auth.getUser(token)
    return error || data.user?.is_anonymous ? null : data.user || null
  } catch {
    return null
  }
}
