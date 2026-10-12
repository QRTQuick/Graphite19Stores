import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useStore } from '../context/useStore.js'

const authImage = 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85'

export default function AuthPage({ mode = 'login' }) {
  const signup = mode === 'signup'
  const resetMode = mode === 'reset'
  const { user } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.from === '/checkout' || location.state?.from === '/orders' || location.state?.from === '/sell' || location.state?.from?.startsWith('/marketplace/checkout/') || location.state?.from?.startsWith('/marketplace/listing/') || location.state?.from?.startsWith('/payment/return')
    ? location.state.from
    : '/account'
  const checkoutRequired = location.state?.checkoutRequired === true
  const authSwitchPath = signup || resetMode ? '/login' : '/signup'
  const authSwitchLabel = signup || resetMode ? 'Sign in' : 'Create an account'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(resetMode && Boolean(supabase))
  const [recoveryReady, setRecoveryReady] = useState(false)

  useEffect(() => {
    if (!resetMode) return undefined
    if (!supabase) return undefined
    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        setRecoveryReady(true)
        setCheckingRecovery(false)
      }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setRecoveryReady(Boolean(data.session))
      setCheckingRecovery(false)
      if (error) setMessage('This reset link could not be verified. Request a fresh link and try again.')
    }).catch(() => {
      if (active) { setRecoveryReady(false); setCheckingRecovery(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [resetMode])

  if (user && !resetMode) return <Navigate to="/account" replace/>

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setMessage('Supabase is not configured. Add the project URL and publishable key to .env and restart Vite.')
      return
    }
    if (resetMode && !recoveryReady) {
      setMessage('This reset link is invalid or expired. Request a new password reset link from sign in.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      if (resetMode) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setMessage('Your password has been updated. Taking you to your account…')
        navigate('/account', { replace: true })
      } else if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}${returnTo}` },
        })
        if (error) throw error
        if (data.session) navigate(returnTo, { replace: true })
        else setMessage('Your account is ready. Check your email to confirm it, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(returnTo, { replace: true })
      }
    } catch (error) {
      setMessage(error.message || 'We could not complete that request.')
    } finally {
      setBusy(false)
    }
  }

  const signInGoogle = async () => {
    if (!supabase) {
      setMessage('Supabase is not configured. Add the project URL and publishable key to .env and restart Vite.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${returnTo}` } })
    if (error) setMessage(error.message)
    setBusy(false)
  }

  const sendResetLink = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setMessage('Supabase is not configured. Add the project URL and publishable key to .env and restart Vite.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw error
      setResetSent(true)
      setMessage('If that email has an account, a password reset link is on its way. Check your inbox and spam folder.')
    } catch (error) {
      setMessage(error.message || 'We could not send a reset link. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (forgotMode) return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">GRAPHITE19STORES ACCOUNT</p><h1>Forgot your<br/><em>password?</em></h1><p className="auth-intro">Enter the email for your account and we’ll send you a secure reset link.</p><form className="auth-form" onSubmit={sendResetLink}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={resetSent}/></label><button className="button button-dark auth-submit" disabled={busy || resetSent}>{busy ? 'Sending link…' : resetSent ? 'Reset link sent' : 'Send reset link'} <span>→</span></button></form>{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-switch"><button type="button" className="forgot-link" onClick={() => { setForgotMode(false); setResetSent(false); setMessage('') }}>← Back to sign in</button></p><p className="auth-terms">By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p></section><aside className="auth-image"><img src={authImage} alt="Graphite19Stores everyday style"/><div><span>G19 / YOUR EVERYDAY, YOUR WAY</span><h2>Find your<br/><em>own kind</em> of bold.</h2></div></aside></main>

  if (resetMode && checkingRecovery) return <main className="auth-page"><section className="auth-panel" aria-live="polite"><p className="eyebrow">GRAPHITE19STORES ACCOUNT</p><h1>Checking your<br/><em>reset link.</em></h1><p className="auth-intro">Please wait while we verify your secure password reset session.</p></section><aside className="auth-image"><img src={authImage} alt="Graphite19Stores everyday style"/></aside></main>

  if (resetMode && !recoveryReady) return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">GRAPHITE19STORES ACCOUNT</p><h1>Reset link<br/><em>expired.</em></h1><p className="auth-intro">This password reset link is invalid or expired. Request a new link and open it on this device.</p>{message && <p className="auth-message" role="status">{message}</p>}<Link className="button button-dark auth-submit" to="/login">Back to sign in <span>→</span></Link></section><aside className="auth-image"><img src={authImage} alt="Graphite19Stores everyday style"/></aside></main>

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">GRAPHITE19STORES ACCOUNT</p><h1>{resetMode ? <>Choose a<br/><em>new password.</em></> : signup ? <>Make yourself<br/><em>at home.</em></> : checkoutRequired ? <>Sign in to<br/><em>check out.</em></> : <>Welcome<br/><em>back.</em></>}</h1><p className="auth-intro">{resetMode ? 'Choose a new password for your account.' : signup ? 'Create an account to keep your details close and checkout smoother.' : checkoutRequired ? 'Please sign in to continue to checkout. Your bag is saved and will be waiting for you.' : 'Sign in to see your account and keep your details together.'}</p>{!resetMode && <><button className="google-button" type="button" onClick={signInGoogle} disabled={busy}><svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 5.7v5.1h6.7c3.9-3.6 6-8.7 6-14.5Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-5l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3C9.2 39.4 16 44 24 44Z"/><path fill="#FBBC05" d="M12.6 27.4a12 12 0 0 1 0-6.8v-5.3H5.8a20 20 0 0 0 0 17.4l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4 16 4 9.2 8.6 5.8 15.3l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg><span>Continue with Google</span><span className="google-arrow" aria-hidden="true">→</span></button><div className="auth-divider"><span>or use your email</span></div></>}
    <form className="auth-form" onSubmit={handleSubmit}>{signup && <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required/></label>}{!resetMode && <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label>}<label>{resetMode ? 'New password' : 'Password'}<input type="password" autoComplete={signup || resetMode ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required/></label>{!signup && !resetMode && <button className="forgot-link" type="button" onClick={() => { setForgotMode(true); setMessage('') }} disabled={busy}>Forgot password?</button>}<button className="button button-dark auth-submit" disabled={busy}>{busy ? 'Please wait…' : resetMode ? 'Update password' : signup ? 'Create account' : 'Sign in'} <span>→</span></button></form>{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-switch">{signup ? 'Already have an account?' : resetMode ? 'Want to sign in?' : 'New to Graphite19Stores?'} <Link to={authSwitchPath} state={location.state}>{authSwitchLabel}</Link></p><p className="auth-terms">By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p></section><aside className="auth-image"><img src={authImage} alt="Graphite19Stores everyday style"/><div><span>G19 / YOUR EVERYDAY, YOUR WAY</span><h2>Find your<br/><em>own kind</em> of bold.</h2></div></aside></main>
}
