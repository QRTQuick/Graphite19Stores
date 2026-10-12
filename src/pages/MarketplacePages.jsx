import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useStore } from '../context/useStore.js'
import countries from '../data/countries.js'

const categories = [
  ['all', 'Everything'], ['clothes', 'Clothes'], ['cars', 'Cars'],
  ['pcs', 'PCs & tech'], ['watches', 'Watches'], ['other', 'Other'],
]
const conditions = [
  ['new', 'New'], ['used_like_new', 'Like new'], ['used_good', 'Good'], ['used_fair', 'Fair'],
]
const attributesByCategory = {
  clothes: [{ key: 'size', label: 'Size' }, { key: 'color', label: 'Color' }, { key: 'material', label: 'Material' }],
  cars: [{ key: 'make', label: 'Make', required: true }, { key: 'model', label: 'Model', required: true }, { key: 'year', label: 'Year', required: true }, { key: 'mileage', label: 'Mileage' }],
  pcs: [{ key: 'processor', label: 'Processor', required: true }, { key: 'memory', label: 'RAM / memory', required: true }, { key: 'storage', label: 'Storage', required: true }, { key: 'graphics', label: 'Graphics' }],
  watches: [{ key: 'movement', label: 'Movement' }, { key: 'case_size', label: 'Case size' }, { key: 'material', label: 'Material' }],
  other: [{ key: 'details', label: 'Key details' }],
}
const money = (amount, currency = 'NGN') => new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(amount) || 0)

function ListingCard({ listing }) {
  return <article className="market-listing-card">
    <Link className="market-listing-image" to={`/marketplace/listing/${listing.id}`}><img src={listing.image_url} alt={listing.title} loading="lazy"/><span>{listing.category.toUpperCase()}</span></Link>
    <div className="market-listing-copy"><div><Link to={`/marketplace/listing/${listing.id}`}><h2>{listing.title}</h2></Link><p>{listing.brand} · {listing.condition.replaceAll('_', ' ')} · {listing.city}, {listing.region}</p></div><strong>{money(listing.price, listing.currency)}</strong></div>
    <p className="market-seller-name">Sold by {listing.seller?.store_name || 'Marketplace seller'}</p>
  </article>
}

export function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState(() => categories.some(([key]) => key === new URLSearchParams(window.location.search).get('category')) ? new URLSearchParams(window.location.search).get('category') : 'all')
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const [state, setState] = useState('loading')
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!supabase) { setState('unavailable'); return }
      let request = supabase.from('marketplace_listings').select('id,category,brand,title,price,currency,condition,image_url,country_code,region,city,created_at,seller:marketplace_sellers(store_name)').eq('status', 'active').order('created_at', { ascending: false }).limit(100)
      if (activeCategory !== 'all') request = request.eq('category', activeCategory)
      const { data, error } = await request
      if (!active) return
      if (error) { setListings([]); setState('unavailable'); return }
      setListings(data || [])
      setState('ready')
    }
    void load()
    return () => { active = false }
  }, [activeCategory])
  const visible = listings.filter((listing) => `${listing.title} ${listing.city} ${listing.region} ${listing.seller?.store_name || ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  return <main className="inner-page marketplace-page"><section className="page-heading"><p className="eyebrow">THE GRAPHITE19 MARKETPLACE</p><h1>Good finds.<br/><em>Good people.</em></h1><p>Discover pieces from independent sellers, local shops and trusted brands.</p></section>
    <div className="marketplace-actions"><div><p className="eyebrow">FIND YOUR NEXT</p><h2>Shop independent.</h2></div><Link className="button button-dark" to="/sell">Open a seller store <span>→</span></Link></div>
    <div className="market-toolbar"><div className="market-filters" role="group" aria-label="Filter marketplace by category">{categories.map(([key, label]) => <button key={key} className={activeCategory === key ? 'active' : ''} onClick={() => { setState('loading'); setActiveCategory(key) }}>{label}</button>)}</div><label className="market-search"><span className="sr-only">Search marketplace</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clothes, cars, PCs…"/></label></div>
    {state === 'loading' && <p className="market-state" role="status">Finding great listings…</p>}
    {state === 'unavailable' && <div className="market-state"><h2>The marketplace is getting ready.</h2><p>Listings will appear here when the marketplace database is connected.</p></div>}
    {state === 'ready' && visible.length > 0 && <div className="market-grid">{visible.map((listing) => <ListingCard key={listing.id} listing={listing}/>)}</div>}
    {state === 'ready' && visible.length === 0 && <div className="market-state"><h2>No listings here yet.</h2><p>Try another category or check back soon.</p><Link className="text-link" to="/sell">Become the first seller <span>→</span></Link></div>}
    <section className="market-trust"><div><span>01</span><h2>Real sellers</h2><p>Every store applies before it can list products.</p></div><div><span>02</span><h2>Reviewed listings</h2><p>New items stay in review until approved by our team.</p></div><div><span>03</span><h2>Talk directly</h2><p>Ask a seller questions before you make a decision.</p></div></section>
  </main>
}

export function SellerPage() {
  const { user, authLoading } = useStore()
  const [seller, setSeller] = useState(null)
  const [listings, setListings] = useState([])
  const [inbox, setInbox] = useState([])
  const [sellerOrders, setSellerOrders] = useState([])
  const [replies, setReplies] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ store_name: '', description: '', country_code: user?.user_metadata?.country_code || 'NG', region: user?.user_metadata?.region || '' })
  const [listing, setListing] = useState({ category: 'clothes', brand: '', title: '', description: '', attributes: {}, price: '', currency: 'NGN', condition: 'new', image_url: '', country_code: user?.user_metadata?.country_code || 'NG', region: user?.user_metadata?.region || '', city: '' })

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!supabase || !user) { setLoading(false); return }
      const [{ data: profile }, { data: items }, { data: messages }] = await Promise.all([
        supabase.from('marketplace_sellers').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('marketplace_listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
        supabase.from('marketplace_messages').select('id,listing_id,sender_id,recipient_id,body,created_at,listing:marketplace_listings(title)').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100),
      ])
      if (!active) return
      if (profile) {
        setSeller(profile)
        setForm({ store_name: profile.store_name, description: profile.description, country_code: profile.country_code, region: profile.region })
      }
      setListings(items || [])
      setInbox(messages || [])
      setLoading(false)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session?.access_token) {
          const orderResponse = await fetch('/api/payments/seller-orders', { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } })
          const orderPayload = await orderResponse.json()
          if (orderResponse.ok && active) setSellerOrders(orderPayload.orders || [])
        }
      } catch {
        // Seller orders are optional until the marketplace migration and payment backend are configured.
      }
    }
    void load()
    return () => { active = false }
  }, [user])

  const apply = async (event) => {
    event.preventDefault()
    if (!supabase || !user) return
    setBusy(true); setMessage('')
    const { data, error } = await supabase.from('marketplace_sellers').insert({ user_id: user.id, seller_terms_version: '2026-10-12-v2', ...form }).select().single()
    setBusy(false)
    if (error) { setMessage(error.code === '23505' ? 'A seller application already exists for this account.' : 'We could not submit your application. Check the database setup and try again.'); return }
    setSeller(data)
    setMessage('Application submitted. Your seller profile is pending review.')
  }
  const saveStore = async (event) => {
    event.preventDefault()
    setBusy(true); setMessage('')
    const { data, error } = await supabase.from('marketplace_sellers').update({ store_name: form.store_name, description: form.description, country_code: form.country_code, region: form.region, updated_at: new Date().toISOString() }).eq('user_id', user.id).select().single()
    setBusy(false)
    if (error) { setMessage('We could not save your store details.'); return }
    setSeller(data); setMessage('Store details saved.')
  }
  const submitListing = async (event) => {
    event.preventDefault()
    setBusy(true); setMessage('')
    const { data, error } = await supabase.from('marketplace_listings').insert({ ...listing, brand: listing.brand.trim() || 'Unbranded', seller_id: user.id, price: Number(listing.price) }).select().single()
    setBusy(false)
    if (error) { setMessage('We could not submit the listing. Check the required fields and database setup.'); return }
    setListings((current) => [data, ...current]); setListing((current) => ({ ...current, title: '', description: '', price: '', image_url: '', city: '' })); setMessage('Listing submitted for review.')
  }
  const sendSellerReply = async (event, original) => {
    event.preventDefault()
    const body = replies[original.id]?.trim()
    if (!body) return
    setBusy(true); setMessage('')
    const { data, error } = await supabase.from('marketplace_messages').insert({ listing_id: original.listing_id, sender_id: user.id, recipient_id: original.sender_id, body }).select('id,listing_id,sender_id,recipient_id,body,created_at').single()
    setBusy(false)
    if (error) { setMessage('We could not send your reply.'); return }
    setInbox((current) => [data, ...current]); setReplies((current) => ({ ...current, [original.id]: '' })); setMessage('Reply sent.')
  }
  const advanceSellerOrder = async (item, nextStatus) => {
    setBusy(true); setMessage('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/payments/update-fulfillment', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify({ orderId: item.order_id, nextStatus }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Order update failed.')
      setSellerOrders((current) => current.map((line) => line.order_id === item.order_id ? { ...line, order: { ...line.order, fulfillment_status: payload.fulfillment_status } } : line))
      setMessage('Order status updated.')
    } catch (error) {
      setMessage(error.message || 'We could not update this order.')
    } finally {
      setBusy(false)
    }
  }

  if (loading || authLoading) return <main className="inner-page"><div className="market-state" role="status">Loading your seller space…</div></main>
  if (!user) return <main className="inner-page"><section className="market-state"><h1>Start with an account.</h1><p>Sign in to apply for a seller store.</p><Link className="button button-dark" to="/login" state={{ from: '/sell' }}>Sign in <span>→</span></Link></section></main>
  if (!seller) return <main className="inner-page seller-page"><section className="page-heading"><p className="eyebrow">SELL ON GRAPHITE19</p><h1>Bring your store<br/><em>to the table.</em></h1><p>Apply to list clothes, cars, computers, watches and other finds. Seller stores and listings are reviewed before going public.</p></section><form className="seller-form" onSubmit={apply}><h2>Seller application</h2><label>Store name<input value={form.store_name} onChange={(event) => setForm({ ...form, store_name: event.target.value })} minLength={2} maxLength={100} required/></label><label>About your store<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={2000} rows="4"/></label><label>Country<select value={form.country_code} onChange={(event) => setForm({ ...form, country_code: event.target.value })}>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label>State, province or region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} required maxLength={120}/></label><label className="seller-consent"><input type="checkbox" required/><span>I have read and agree to the <Link to="/seller-terms">Seller Terms</Link>, including marketplace review, buyer messages and platform-collected payment terms.</span></label><button className="button button-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'} <span>→</span></button>{message && <p className="auth-message" role="status">{message}</p>}<p className="seller-legal">Do not list prohibited, stolen or counterfeit goods.</p></form></main>
  return <main className="inner-page seller-page"><section className="seller-dashboard-heading"><div><p className="eyebrow">SELLER SPACE</p><h1>{seller.store_name}</h1><p>Seller status: <strong className={`seller-status ${seller.status}`}>{seller.status}</strong></p></div><Link className="text-link" to="/marketplace">View marketplace <span>→</span></Link></section>
    {seller.status !== 'approved' ? <div className="seller-review-notice"><h2>Your application is under review.</h2><p>You can update your store details while our team reviews your application. Listing tools become available after approval.</p><form className="seller-form seller-edit-form" onSubmit={saveStore}><label>Store name<input value={form.store_name} onChange={(event) => setForm({ ...form, store_name: event.target.value })} required maxLength={100}/></label><label>About your store<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="3" maxLength={2000}/></label><label>Country<select value={form.country_code} onChange={(event) => setForm({ ...form, country_code: event.target.value })}>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label>Region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} required maxLength={120}/></label><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save store details'} <span>→</span></button></form></div> : <div className="seller-dashboard-grid"><form className="seller-form" onSubmit={submitListing}><h2>Add a listing</h2><label>Category<select value={listing.category} onChange={(event) => setListing({ ...listing, category: event.target.value, attributes: {} })}>{categories.slice(1).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Brand<input value={listing.brand} onChange={(event) => setListing({ ...listing, brand: event.target.value })} placeholder="Brand or Unbranded" maxLength={100}/></label>{(attributesByCategory[listing.category] || []).map((field) => <label key={field.key}>{field.label}<input value={listing.attributes[field.key] || ''} onChange={(event) => setListing({ ...listing, attributes: { ...listing.attributes, [field.key]: event.target.value } })} maxLength={100} required={field.required}/></label>)}<label>Listing title<input value={listing.title} onChange={(event) => setListing({ ...listing, title: event.target.value })} minLength={3} maxLength={160} required/></label><label>Description<textarea value={listing.description} onChange={(event) => setListing({ ...listing, description: event.target.value })} minLength={10} maxLength={10000} rows="5" required/></label><div className="seller-form-row"><label>Price<input type="number" value={listing.price} onChange={(event) => setListing({ ...listing, price: event.target.value })} min="1" step="0.01" required/></label><label>Currency<select value={listing.currency} onChange={(event) => setListing({ ...listing, currency: event.target.value })}><option value="NGN">NGN ₦</option><option value="USD">USD $</option></select></label></div><label>Condition<select value={listing.condition} onChange={(event) => setListing({ ...listing, condition: event.target.value })}>{conditions.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Product image URL<input type="url" value={listing.image_url} onChange={(event) => setListing({ ...listing, image_url: event.target.value })} placeholder="https://…" required/></label><div className="seller-form-row"><label>Country<select value={listing.country_code} onChange={(event) => setListing({ ...listing, country_code: event.target.value })}>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label>State / region<input value={listing.region} onChange={(event) => setListing({ ...listing, region: event.target.value })} required maxLength={120}/></label></div><label>City<input value={listing.city} onChange={(event) => setListing({ ...listing, city: event.target.value })} required maxLength={120}/></label><button className="button button-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit listing for review'} <span>→</span></button>{message && <p className="auth-message" role="status">{message}</p>}</form><section className="seller-listings"><p className="eyebrow">YOUR CATALOG</p><h2>Your listings</h2>{listings.length ? listings.map((item) => <article className="seller-listing-row" key={item.id}><img src={item.image_url} alt=""/><div><h3>{item.brand} {item.title}</h3><p>{money(item.price, item.currency)} · {item.status}</p></div></article>) : <p className="seller-empty">Your submitted listings will appear here.</p>}</section></div>}
    {seller.status === 'approved' && <section className="seller-listings seller-inbox"><p className="eyebrow">BUYER MESSAGES</p><h2>Conversations about your listings</h2>{inbox.length ? inbox.map((item) => <article className="seller-message-card" key={item.id}><p><strong>{item.listing?.title || 'Marketplace listing'}</strong> · {new Date(item.created_at).toLocaleString()}</p><blockquote>{item.body}</blockquote><form onSubmit={(event) => sendSellerReply(event, item)}><label>Reply<textarea value={replies[item.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [item.id]: event.target.value }))} rows="2" maxLength={3000} required/></label><button className="button button-dark" disabled={busy}>Reply <span>→</span></button></form></article>) : <p className="seller-empty">Messages from interested buyers appear here.</p>}{message && <p className="auth-message" role="status">{message}</p>}</section>}
    {seller.status === 'approved' && <section className="seller-listings seller-orders"><p className="eyebrow">PAID MARKETPLACE ORDERS</p><h2>Orders to fulfil</h2>{sellerOrders.length ? sellerOrders.map((item) => { const nextStatus = { pending: 'processing', processing: 'shipped', shipped: 'delivered' }[item.order.fulfillment_status]; return <article className="seller-order-card" key={item.id}><div className="seller-order-head"><div><p className="eyebrow">{item.order.order_reference}</p><h3>{item.item_title}</h3><p>{money(item.unit_price, item.currency)} · Payment confirmed · {item.order.fulfillment_status}</p></div>{nextStatus && <button className="button button-dark" disabled={busy} onClick={() => advanceSellerOrder(item, nextStatus)}>{nextStatus === 'processing' ? 'Start fulfilment' : nextStatus === 'shipped' ? 'Mark shipped' : 'Mark delivered'} <span>→</span></button>}</div><div className="seller-delivery-address"><strong>Delivery details</strong><p>{item.order.shipping_address.full_name} · {item.order.shipping_address.phone}<br/>{item.order.shipping_address.address}, {item.order.shipping_address.city}, {item.order.shipping_address.region}</p></div></article> }) : <p className="seller-empty">Paid orders for your store will appear here.</p>}{message && <p className="auth-message" role="status">{message}</p>}<p className="seller-payout-note">Buyer payment is collected by Graphite19Stores. Seller settlement is handled manually under your written seller agreement.</p></section>}
  </main>
}

export function MarketplaceListingPage() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useStore()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [thread, setThread] = useState([])
  const [reportReason, setReportReason] = useState('suspected_scam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportMessage, setReportMessage] = useState('')
  const viewerId = user?.id
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase?.from('marketplace_listings').select('*,seller:marketplace_sellers(store_name,description,country_code,region,checkout_enabled)').eq('id', id).eq('status', 'active').maybeSingle() || {}
      if (active) { setListing(data || null); setLoading(false) }
      if (data && viewerId) {
        const { data: messages } = await supabase.from('marketplace_messages').select('id,sender_id,recipient_id,body,created_at').eq('listing_id', id).order('created_at', { ascending: true }).limit(100)
        if (active) setThread(messages || [])
      }
    }
    void load()
    return () => { active = false }
  }, [id, viewerId])
  const sendMessage = async (event) => {
    event.preventDefault()
    if (!user) { setMessage('Sign in to contact this seller.'); return }
    if (user.id === listing.seller_id) { setMessage('This is your own listing.'); return }
    setBusy(true); setMessage('')
    const { error } = await supabase.from('marketplace_messages').insert({ listing_id: listing.id, sender_id: user.id, recipient_id: listing.seller_id, body })
    setBusy(false)
    if (error) { setMessage('We could not send your message. Please try again.'); return }
    setBody(''); setThread((current) => [...current, { ...({ id: globalThis.crypto?.randomUUID?.() || String(Date.now()) }), listing_id: listing.id, sender_id: user.id, recipient_id: listing.seller_id, body, created_at: new Date().toISOString() }]); setMessage('Message sent. We’ll keep the conversation here.')
  }
  const reportListing = async (event) => {
    event.preventDefault()
    if (!user) { setReportMessage('Sign in to report this listing.'); return }
    setBusy(true); setReportMessage('')
    const { error } = await supabase.from('marketplace_listing_reports').insert({ listing_id: listing.id, reporter_id: user.id, reason: reportReason, details: reportDetails })
    setBusy(false)
    if (error) { setReportMessage('We could not submit this report. Please contact customer care.'); return }
    setReportDetails(''); setReportMessage('Report received. Our team will review this listing.')
  }
  if (loading) return <main className="inner-page"><p className="market-state">Loading listing…</p></main>
  if (!listing) return <main className="inner-page"><div className="market-state"><h1>Listing unavailable.</h1><Link to="/marketplace">Back to marketplace <span>→</span></Link></div></main>
  return <main className="inner-page market-detail-page"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/marketplace">Marketplace</Link><span>/</span><span>{listing.title}</span></div><div className="market-detail"><img src={listing.image_url} alt={listing.title}/><section><p className="eyebrow">{listing.brand} · {listing.category} · {listing.condition.replaceAll('_', ' ')}</p><h1>{listing.title}</h1><p className="market-detail-price">{money(listing.price, listing.currency)}</p><p className="market-detail-location">{listing.city}, {listing.region}, {listing.country_code}</p><dl className="market-attributes">{Object.entries(listing.attributes || {}).filter(([, value]) => String(value).trim()).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl><p className="market-detail-description">{listing.description}</p><div className="market-store-card"><p className="eyebrow">SELLER</p><h2>{listing.seller?.store_name}</h2><p>{listing.seller?.description || 'Independent Graphite19 marketplace seller.'}</p><small>{listing.seller?.region}, {listing.seller?.country_code}</small></div>{listing.currency === 'NGN' && listing.country_code === 'NG' && listing.seller?.checkout_enabled && user?.id !== listing.seller_id && <Link className="button button-dark market-buy-button" to={`/marketplace/checkout/${listing.id}`}>Buy now with Flutterwave <span>→</span></Link>}{user && user.id !== listing.seller_id && <section className="market-conversation"><h2>Your conversation</h2>{thread.map((item) => <article key={item.id} className={item.sender_id === user.id ? 'market-message sent' : 'market-message received'}><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString()}</time></article>)}</section>}{!user && <Link className="button button-dark market-buy-button" to="/login" state={{ from: location.pathname }}>Sign in to contact the seller <span>→</span></Link>}{user && user.id !== listing.seller_id && <form className="seller-form contact-seller-form" onSubmit={sendMessage}><h2>Ask the seller</h2><label>Your message<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={1} maxLength={3000} rows="4" required placeholder="Ask about condition, availability or collection…"/></label><button className="button button-dark" disabled={busy}>{busy ? 'Sending…' : 'Send seller a message'} <span>→</span></button>{message && <p className="auth-message" role="status">{message}</p>}</form>}{user && user.id !== listing.seller_id && <form className="market-report-form" onSubmit={reportListing}><details><summary>Report this listing</summary><label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="suspected_scam">Suspected scam</option><option value="counterfeit">Counterfeit item</option><option value="prohibited_item">Prohibited item</option><option value="misleading_description">Misleading description</option><option value="safety_concern">Safety concern</option><option value="other">Other</option></select></label><label>Details<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} rows="3" maxLength={3000} placeholder="Tell us what looks wrong (optional)."/></label><button className="text-link" disabled={busy}>Send report <span>→</span></button>{reportMessage && <p className="auth-message" role="status">{reportMessage}</p>}</details></form>}</section></div></main>
}
