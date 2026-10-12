import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../components/StoreLayout.jsx'
import { useStore } from '../context/useStore.js'
import { supabase } from '../lib/supabase.js'
import countries from '../data/countries.js'

const newSessionToken = () => globalThis.crypto?.randomUUID?.() || `g19-${Date.now()}-${Math.random().toString(36).slice(2)}`

async function getAuthHeaders() {
  if (!supabase) throw new Error('Sign-in is unavailable.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Please sign in to continue.')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

export default function CheckoutPage() {
  const { cart, changeQuantity } = useStore()
  const [message, setMessage] = useState('')
  const [address, setAddress] = useState({ address: '', unit: '', city: '', region: '', postalCode: '', countryCode: 'NG', country: 'Nigeria' })
  const [selectedPlaceId, setSelectedPlaceId] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle')
  const [addressBusy, setAddressBusy] = useState(false)
  const [sessionToken, setSessionToken] = useState(newSessionToken)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  useEffect(() => {
    const query = address.address.trim()
    if (selectedPlaceId || query.length < 4) return undefined

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearchStatus('loading')
      try {
        const response = await fetch('/api/address-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
          body: JSON.stringify({ input: query, countryCode: address.countryCode, sessionToken }),
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Address suggestions are unavailable.')
        setSuggestions(data.suggestions || [])
        setSearchStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([])
          setSearchStatus('unavailable')
        }
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [address.address, address.countryCode, selectedPlaceId, sessionToken])

  const updateAddress = (field, value) => {
    setAddress((current) => ({ ...current, [field]: value }))
    setMessage('')
    setSuggestions([])
    setSearchStatus('idle')
    if (field === 'address') setSelectedPlaceId('')
  }

  const selectSuggestion = async (suggestion) => {
    setAddressBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/address-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ placeId: suggestion.placeId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'We couldn’t load that address.')
      setSelectedPlaceId(data.placeId)
      setAddress((current) => ({
        ...current,
        address: data.address || data.formattedAddress || suggestion.description,
        unit: data.unit || '',
        city: data.city || '',
        region: data.region || '',
        postalCode: data.postalCode || '',
        country: data.country || current.country,
        countryCode: data.countryCode || current.countryCode,
      }))
      setSuggestions([])
      setSearchStatus('idle')
      setSessionToken(newSessionToken())
    } catch {
      setMessage('We couldn’t load that address. Please enter the details manually or choose another suggestion.')
    } finally {
      setAddressBusy(false)
    }
  }


  if (!cart.length) return <main className="checkout-page"><section className="checkout-empty"><span className="checkout-kicker">YOUR BAG / 00</span><p className="eyebrow">A LITTLE ROOM FOR SOMETHING GOOD</p><h1>Your bag is <em>waiting.</em></h1><p>There’s nothing in it just yet. Find a piece that feels like you.</p><Link className="button button-dark" to="/shop">Explore the collection <span>→</span></Link></section></main>

  return <main className="checkout-page">
    <div className="checkout-topline"><Link to="/shop" className="checkout-back">← &nbsp;Back to the collection</Link><span className="checkout-secure"><span aria-hidden="true">⌑</span> SECURE CHECKOUT</span></div>
    <section className="checkout-intro"><p className="eyebrow">THE FINAL DETAILS</p><h1>Make it <em>yours.</em></h1><p>Your selection is saved while you check out.</p></section>
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
        <section className="checkout-step"><div className="checkout-step-title"><span>01</span><div><h2>Where should we reach you?</h2><p>We’ll use these details for order updates.</p></div></div>
          <div className="checkout-fields"><label className="checkout-field checkout-field-wide">Email address<input type="email" name="email" placeholder="you@example.com" autoComplete="email" maxLength={254} required/></label><label className="checkout-field">First name<input name="firstName" placeholder="First name" autoComplete="given-name" maxLength={80} required/></label><label className="checkout-field">Last name<input name="lastName" placeholder="Last name" autoComplete="family-name" maxLength={80} required/></label><label className="checkout-field checkout-field-wide">Phone number<input type="tel" name="phone" placeholder="+234 800 000 0000" autoComplete="tel" maxLength={32} required/></label></div>
        </section>
        <section className="checkout-step"><div className="checkout-step-title"><span>02</span><div><h2>Where should it go?</h2><p>Choose a suggested address or enter your delivery details.</p></div></div>
          <div className="checkout-fields">
            <label className="checkout-field checkout-field-wide address-search-field">Street address<input name="address" value={address.address} onChange={(event) => updateAddress('address', event.target.value)} placeholder="Start typing a street address" autoComplete="address-line1" minLength={4} maxLength={180} required aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="address-suggestions"/></label>
            {suggestions.length > 0 && <div className="address-suggestions" id="address-suggestions" role="listbox" aria-label="Suggested delivery addresses">{suggestions.map((suggestion) => <button key={suggestion.placeId} type="button" role="option" onClick={() => selectSuggestion(suggestion)}>{suggestion.description}</button>)}<div className="google-attribution"><span>Address suggestions</span><img src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg" alt="Google"/></div></div>}
            {searchStatus === 'loading' && <p className="address-hint checkout-field-wide" role="status">Searching worldwide address suggestions…</p>}
            {searchStatus === 'unavailable' && <p className="address-hint checkout-field-wide">Suggestions are unavailable right now. You can enter the address manually.</p>}
            {addressBusy && <p className="address-hint checkout-field-wide" role="status">Checking address details…</p>}
            <label className="checkout-field checkout-field-wide">Apartment, suite, or unit<input name="unit" value={address.unit} onChange={(event) => updateAddress('unit', event.target.value)} placeholder="Apartment, suite, unit (optional)" autoComplete="address-line2" maxLength={100}/></label>
            <label className="checkout-field">City or town<input name="city" value={address.city} onChange={(event) => updateAddress('city', event.target.value)} placeholder="City or town" autoComplete="address-level2" maxLength={100} required/></label>
            <label className="checkout-field">State, province, or region<input name="region" value={address.region} onChange={(event) => updateAddress('region', event.target.value)} placeholder="State or region" autoComplete="address-level1" maxLength={100}/></label>
            <label className="checkout-field">Postal or ZIP code<input name="postalCode" value={address.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} placeholder="If used in your country" autoComplete="postal-code" maxLength={24}/></label>
            <label className="checkout-field">Country<select name="countryCode" value={address.countryCode} onChange={(event) => {
              const chosen = countries.find((country) => country.code === event.target.value)
              setAddress((current) => ({ ...current, countryCode: event.target.value, country: chosen?.name || '', city: '', region: '', postalCode: '' }))
              setSelectedPlaceId('')
                        setMessage('')
              setSuggestions([])
              setSearchStatus('idle')
            }} autoComplete="country" required>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
          </div>
          <p className="address-privacy">Address suggestions are provided by Google Maps Platform. Address verification is temporarily unavailable.</p>
        </section>
        <section className="checkout-step payment-step"><div className="checkout-step-title"><span>03</span><div><h2>Payment</h2><p>Secure payment, when Flutterwave is connected.</p></div></div><div className="flutterwave-card"><span className="flutterwave-symbol" aria-hidden="true">F</span><span><strong>Flutterwave</strong><small>Payment options will be shown on the secure payment step.</small></span><span className="payment-lock" aria-hidden="true">⌑</span></div></section>
        {message && <p className="checkout-message" role="status" aria-live="polite">{message}</p>}
        <p className="checkout-message" role="status">Online checkout is paused while address verification and payments are configured. No order has been placed.</p>
        <button className="checkout-pay" type="button" disabled><span>Checkout temporarily unavailable</span><span aria-hidden="true">→</span></button>
        <p className="checkout-legal">By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
      </form>
      <aside className="order-summary"><div className="summary-heading"><div><p className="eyebrow">A GOOD CHOICE</p><h2>Your selection</h2></div><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>
        <div className="summary-items">{cart.map((item) => <article className="summary-item" key={item.key}><div className="summary-image"><ProductImage product={item} width={220}/><span>{item.quantity}</span></div><div className="summary-item-copy"><h3>{item.title}</h3><p>{item.variantTitle || item.color || 'Graphite19Stores'}</p><div className="summary-quantity"><button type="button" onClick={() => changeQuantity(item.key, -1)} aria-label={`Remove one ${item.title}`}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.key, 1)} aria-label={`Add one ${item.title}`}>+</button></div></div><strong>${(item.price * item.quantity).toFixed(2)}</strong></article>)}</div>
        <div className="summary-costs"><div><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div><span>Shipping</span><span className="summary-muted">Calculated after address</span></div><div className="summary-total"><strong>Total</strong><strong>${subtotal.toFixed(2)} <small>USD</small></strong></div></div>
        <div className="summary-note"><span aria-hidden="true">✳</span><p>Made to order, with care.<br/><small>Shipping and final payment details are confirmed before your order is placed.</small></p></div>
      </aside>
    </div>
  </main>
}
