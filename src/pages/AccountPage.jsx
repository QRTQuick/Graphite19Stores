import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useStore } from '../context/useStore.js'
import countries from '../data/countries.js'

export default function AccountPage() {
  const { user } = useStore()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '')
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '')
  const [countryCode, setCountryCode] = useState(user?.user_metadata?.country_code || '')
  const [region, setRegion] = useState(user?.user_metadata?.region || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!supabase || !user) return
    setSaving(true)
    setMessage('')
    const country = countries.find((item) => item.code === countryCode)?.name || ''
    const { error } = await supabase.auth.updateUser({ data: {
      ...user.user_metadata,
      full_name: fullName,
      phone,
      country_code: countryCode,
      country,
      region,
    } })
    setMessage(error ? 'We could not save your details. Please try again.' : 'Your details are saved to your account.')
    setSaving(false)
  }

  return <main className="inner-page account-page"><section className="page-heading compact-heading"><p className="eyebrow">YOUR GRAPHITE19STORES ACCOUNT</p><h1>Good to have you, <em>{fullName.split(' ')[0] || 'friend'}.</em></h1><p>Manage your account details and keep your next visit simple.</p></section><div className="account-columns"><nav className="account-menu"><span>ACCOUNT</span><a className="selected" href="#details">Profile details</a><Link to="/shop">Continue shopping</Link><a href="mailto:graphite19stores@gmail.com">Need help?</a><button className="account-signout" onClick={() => supabase?.auth.signOut()}>Sign out</button></nav><section className="account-card" id="details"><div className="account-card-heading"><div><p className="eyebrow">PROFILE DETAILS</p><h2>Your information</h2></div><span className="account-email">{user?.email}</span></div><form className="auth-form profile-form" onSubmit={saveProfile}><label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)}/></label><label>Email address<input value={user?.email || ''} readOnly disabled/></label><label>Phone number<input autoComplete="tel" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}/></label><label>Country<select autoComplete="country-name" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}><option value="">Choose your country</option>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label>State, province or region<input autoComplete="address-level1" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Enter your state or region"/></label><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <span>→</span></button>{message && <p className="auth-message" role="status">{message}</p>}</form></section></div></main>
}
