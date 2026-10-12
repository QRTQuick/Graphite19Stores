import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useStore } from '../context/useStore.js'

export default function AccountPage() {
  const { user } = useStore()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    async function loadProfile() {
      if (!supabase || !user) return
      const { data, error } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle()
      if (!alive) return
      if (data) {
        setFullName(data.full_name || user.user_metadata?.full_name || '')
        setPhone(data.phone || '')
      } else if (!error) {
        const initialName = user.user_metadata?.full_name || user.user_metadata?.name || ''
        const { error: createError } = await supabase.from('profiles').insert({ id: user.id, full_name: initialName })
        if (createError) setMessage('Your profile table is not ready yet. Apply the migration in supabase/migrations to enable profile details.')
        else setFullName(initialName)
      } else if (error) {
        setMessage('Your profile table is not ready yet. Apply the migration in supabase/migrations to enable profile details.')
      }
      setLoading(false)
    }
    loadProfile()
    return () => { alive = false }
  }, [user])

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!supabase || !user) return
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      phone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    setMessage(error ? 'We could not save your details. Confirm that the profiles migration has been applied.' : 'Your details are saved.')
    setSaving(false)
  }

  return <main className="inner-page account-page"><section className="page-heading compact-heading"><p className="eyebrow">YOUR GRAPHITE19STORES ACCOUNT</p><h1>Good to have you, <em>{fullName.split(' ')[0] || 'friend'}.</em></h1><p>Manage your account details and keep your next visit simple.</p></section><div className="account-columns"><nav className="account-menu"><span>ACCOUNT</span><a className="selected" href="#details">Profile details</a><Link to="/shop">Continue shopping</Link><a href="mailto:graphite19stores@gmail.com">Need help?</a><button className="account-signout" onClick={() => supabase?.auth.signOut()}>Sign out</button></nav><section className="account-card" id="details"><div className="account-card-heading"><div><p className="eyebrow">PROFILE DETAILS</p><h2>Your information</h2></div><span className="account-email">{user?.email}</span></div>{loading ? <p className="catalog-note">Loading your profile…</p> : <form className="auth-form profile-form" onSubmit={saveProfile}><label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)}/></label><label>Email address<input value={user?.email || ''} readOnly disabled/></label><label>Phone number<input autoComplete="tel" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}/></label><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <span>→</span></button>{message && <p className="auth-message" role="status">{message}</p>}</form>}</section></div></main>
}
