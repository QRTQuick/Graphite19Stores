import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useStore } from '../context/useStore.js'
import countries from '../data/countries.js'

export default function AccountPage() {
  const { user } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '')
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '')
  const [countryCode, setCountryCode] = useState(user?.user_metadata?.country_code || '')
  const [region, setRegion] = useState(user?.user_metadata?.region || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!supabase || !user) { setMessage('Please sign in again before saving your profile.'); return }
    if (phone.replace(/\D/g, '').length < 7) { setMessage('Enter a valid phone number with at least 7 digits.'); return }
    if (!countryCode || !countries.some((item) => item.code === countryCode)) { setMessage('Choose your country before saving.'); return }
    setSaving(true)
    setMessage('')
    const country = countries.find((item) => item.code === countryCode)?.name || ''
    try {
      const { error } = await supabase.auth.updateUser({ data: {
        ...user.user_metadata,
        full_name: fullName,
        phone: phone.trim(),
        country_code: countryCode,
        country,
        region,
      } })
      if (error) { setMessage(error.message || 'We could not save your details. Please try again.'); return }
      setMessage('Your details are saved to your account.')
      if (location.state?.requireProfile && location.state?.from) navigate(location.state.from, { replace: true })
    } catch {
      setMessage('We could not reach Supabase. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="inner-page account-page"><section className="page-heading compact-heading"><p className="eyebrow">YOUR GRAPHITE19STORES ACCOUNT</p><h1>Good to have you, <em>{fullName.split(' ')[0] || 'friend'}.</em></h1><p>Manage your account details and keep your next visit simple.</p></section><div className="account-columns"><nav className="account-menu"><span>ACCOUNT</span><a className="selected" href="#details">Profile details</a><Link to="/orders">Order history</Link><Link to="/sell">Open a seller store</Link><Link to="/marketplace">Browse marketplace</Link><a href="mailto:graphite19stores@gmail.com">Need help?</a><button className="account-signout" onClick={() => supabase?.auth.signOut()}>Sign out</button></nav><section className="account-card" id="details"><div className="account-card-heading"><div><p className="eyebrow">PROFILE DETAILS</p><h2>Your information</h2></div><span className="account-email">{user?.email}</span></div>{location.state?.requireProfile && <p className="profile-required-note" role="status">Add your phone number and country to your profile before checkout. Both fields are required.</p>}<form className="auth-form profile-form" onSubmit={saveProfile}><label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)}/></label><label>Email address<input value={user?.email || ''} readOnly disabled/></label><label>Phone number <span className="required-label">Required</span><input autoComplete="tel" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={7} maxLength={32} required/></label><label>Country <span className="required-label">Required</span><select autoComplete="country-name" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} required><option value="">Choose your country</option>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label>State, province or region<input autoComplete="address-level1" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Enter your state or region"/></label><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <span>→</span></button>{message && <p className="auth-message" role="status">{message}</p>}</form></section></div></main>
}
