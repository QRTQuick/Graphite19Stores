import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useStore } from '../context/useStore.js'

const money = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(amount) || 0)

async function authHeaders() {
  if (!supabase) throw new Error('Sign-in is unavailable.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Please sign in to continue.')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

export function MarketplaceCheckoutPage() {
  const { id } = useParams()
  const { user } = useStore()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentsEnabled, setPaymentsEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [address, setAddress] = useState({ fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || '', phone: user?.user_metadata?.phone || '', address: '', city: '', region: user?.user_metadata?.region || '' })

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!supabase) { setLoading(false); return }
      const [{ data }, statusResponse] = await Promise.all([
        supabase.from('marketplace_listings').select('id,seller_id,brand,title,description,price,currency,condition,image_url,country_code,region,city,seller:marketplace_sellers(checkout_enabled)').eq('id', id).eq('status', 'active').maybeSingle(),
        fetch('/api/payments/marketplace-status').catch(() => null),
      ])
      const status = await statusResponse?.json().catch(() => null)
      if (!active) return
      setListing(data || null)
      setPaymentsEnabled(status?.enabled === true)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [id])

  const updateField = (field, value) => setAddress((current) => ({ ...current, [field]: value }))
  const beginPayment = async (event) => {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/payments/create-marketplace', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...await authHeaders() },
        body: JSON.stringify({ listingId: id, ...address, countryCode: 'NG' }),
      })
      const result = await response.json()
      if (!response.ok || !result.paymentUrl) throw new Error(result.error || 'We could not start secure checkout.')
      window.location.assign(result.paymentUrl)
    } catch (error) {
      setMessage(error.message || 'We could not start secure checkout. Please try again.')
      setBusy(false)
    }
  }

  if (loading) return <main className="inner-page"><div className="market-state" role="status">Preparing secure checkout…</div></main>
  if (!listing) return <main className="inner-page"><div className="market-state"><h1>This listing is no longer available.</h1><Link to="/marketplace">Return to the marketplace <span>→</span></Link></div></main>
  if (listing.seller_id === user?.id) return <main className="inner-page"><div className="market-state"><h1>You can’t buy your own listing.</h1><Link to="/sell">Go to your seller space <span>→</span></Link></div></main>
  const eligible = listing.currency === 'NGN' && listing.country_code === 'NG' && listing.seller?.checkout_enabled === true
  return <main className="inner-page marketplace-checkout-page"><div className="breadcrumbs"><Link to="/marketplace">Marketplace</Link><span>/</span><span>Secure checkout</span></div><section className="page-heading"><p className="eyebrow">FLUTTERWAVE / SECURE CHECKOUT</p><h1>One last <em>detail.</em></h1><p>Payment is collected by Graphite19Stores in NGN. Delivery arrangements and any delivery cost are agreed with the seller.</p></section><div className="market-checkout-layout"><form className="seller-form" onSubmit={beginPayment}><h2>Delivery details</h2><label>Full name<input value={address.fullName} onChange={(event) => updateField('fullName', event.target.value)} autoComplete="name" minLength={2} maxLength={120} required/></label><label>Email address<input value={user?.email || ''} type="email" readOnly disabled/></label><label>Phone number<input type="tel" autoComplete="tel" value={address.phone} onChange={(event) => updateField('phone', event.target.value)} minLength={7} maxLength={40} required/></label><label>Street address<input value={address.address} onChange={(event) => updateField('address', event.target.value)} autoComplete="street-address" minLength={5} maxLength={250} required/></label><div className="seller-form-row"><label>City<input value={address.city} onChange={(event) => updateField('city', event.target.value)} autoComplete="address-level2" minLength={2} maxLength={120} required/></label><label>State / region<input value={address.region} onChange={(event) => updateField('region', event.target.value)} autoComplete="address-level1" minLength={2} maxLength={120} required/></label></div>{!eligible && <p className="checkout-warning" role="status">This seller or listing is not cleared for platform checkout. Contact the seller to arrange a purchase.</p>}{!paymentsEnabled && <p className="checkout-warning" role="status">Secure checkout is not enabled yet. The store owner must configure Flutterwave and confirm the seller settlement process.</p>}{message && <p className="auth-message" role="alert">{message}</p>}<button className="button button-dark" disabled={busy || !eligible || !paymentsEnabled}>{busy ? 'Connecting to Flutterwave…' : 'Continue to secure payment'} <span>→</span></button><p className="checkout-legal">By continuing, you agree to our <Link to="/terms">Marketplace Terms</Link> and <Link to="/privacy">Privacy Notice</Link>.</p></form><aside className="market-checkout-summary"><img src={listing.image_url} alt=""/><p className="eyebrow">{listing.brand} · {listing.condition.replaceAll('_', ' ')}</p><h2>{listing.title}</h2><p>{listing.city}, {listing.region}</p><div><span>Item total</span><strong>{money(listing.price)}</strong></div><div><span>Delivery</span><small>Arrange with seller</small></div><div className="market-checkout-total"><span>Pay now</span><strong>{money(listing.price)}</strong></div><p className="market-payment-note">Flutterwave opens on its secure hosted payment page. Never share your PIN or one-time password with a seller.</p></aside></div></main>
}

export function PaymentResultPage() {
  const [state, setState] = useState('checking')
  const [message, setMessage] = useState('Checking your payment with Flutterwave…')
  useEffect(() => {
    let active = true
    const verify = async () => {
      const params = new URLSearchParams(window.location.search)
      const transactionId = params.get('transaction_id') || ''
      const txRef = params.get('tx_ref') || ''
      if (!transactionId || !txRef) {
        if (active) { setState('failed'); setMessage('We could not confirm this payment. If your account was charged, contact customer care with your payment reference.') }
        return
      }
      try {
        const response = await fetch('/api/payments/verify-marketplace', { method: 'POST', headers: { 'Content-Type': 'application/json', ...await authHeaders() }, body: JSON.stringify({ transactionId, txRef }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Payment verification is still pending.')
        if (active) { setState(result.needsSupport ? 'review' : 'paid'); setMessage(result.needsSupport ? 'Payment was confirmed, but we need to check item availability. Customer care will contact you.' : 'Payment confirmed. Your marketplace order is recorded.') }
      } catch (error) {
        if (active) { setState('failed'); setMessage(error.message || 'We could not confirm the payment.') }
      }
    }
    void verify()
    return () => { active = false }
  }, [])
  return <main className="inner-page payment-result-page"><section className="market-state"><p className="eyebrow">FLUTTERWAVE PAYMENT</p><h1>{state === 'paid' ? 'Payment confirmed.' : state === 'review' ? 'We’re checking this order.' : state === 'checking' ? 'One moment…' : 'Payment not confirmed.'}</h1><p role="status">{message}</p>{state !== 'checking' && <div className="market-result-actions"><Link className="button button-dark" to="/orders">View order history <span>→</span></Link><Link className="text-link" to="/marketplace">Return to marketplace</Link></div>}</section></main>
}

export function BuyerOrdersPage() {
  const [orders, setOrders] = useState([])
  const [state, setState] = useState('loading')
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/payments/my-orders', { headers: await authHeaders() })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        if (active) { setOrders(result.orders || []); setState('ready') }
      } catch {
        if (active) setState('unavailable')
      }
    }
    void load()
    return () => { active = false }
  }, [])
  return <main className="inner-page buyer-orders-page"><section className="page-heading"><p className="eyebrow">YOUR GRAPHITE19STORES ACCOUNT</p><h1>Order <em>history.</em></h1><p>Marketplace payments and order updates in one place.</p></section>{state === 'loading' && <p className="market-state" role="status">Loading your orders…</p>}{state === 'unavailable' && <p className="market-state">We could not load order history. Please sign in again.</p>}{state === 'ready' && orders.length === 0 && <div className="market-state"><h2>No marketplace orders yet.</h2><Link to="/marketplace">Explore the marketplace <span>→</span></Link></div>}{state === 'ready' && orders.length > 0 && <div className="buyer-orders-list">{orders.map((order) => <article key={order.id}><div className="buyer-order-heading"><div><p className="eyebrow">{order.order_reference}</p><time>{new Date(order.created_at).toLocaleDateString()}</time></div><strong>{money(order.total)}</strong></div>{order.marketplace_order_items?.map((item) => <p className="buyer-order-line" key={`${order.id}:${item.item_title}`}>{item.item_title} · {item.quantity} × {money(item.unit_price)}</p>)}<div className="buyer-order-status"><span>Payment: {order.payment_status}</span><span>Delivery: {order.fulfillment_status}</span></div></article>)}</div>}</main>
}
