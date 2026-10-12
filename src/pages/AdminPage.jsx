import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/useStore.js'
import { supabase } from '../lib/supabase.js'
import '../admin.css'

const money = (value, currency = 'NGN') => new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(value) || 0)

async function adminHeaders() {
  const { data } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }
}

export default function AdminPage() {
  const { user, authLoading } = useStore()
  const [queue, setQueue] = useState({ sellers: [], listings: [], feedback: [] })
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const isAdmin = String(user?.email || '').toLowerCase() === 'graphite19stores@gmail.com'
  const loadQueue = useCallback(async () => {
    if (!isAdmin) { setState('ready'); return }
    try {
      const response = await fetch('/api/admin/marketplace', { headers: await adminHeaders() })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Review queue is unavailable.')
      setQueue(payload); setState('ready'); setMessage('')
    } catch (error) { setState('error'); setMessage(error.message || 'Review queue is unavailable.') }
  }, [isAdmin])
  useEffect(() => {
    if (authLoading || !isAdmin) return undefined
    const timer = window.setTimeout(() => { void loadQueue() }, 0)
    return () => window.clearTimeout(timer)
  }, [authLoading, isAdmin, loadQueue])
  const act = async (type, id, action) => {
    setBusy(`${type}:${id}`); setMessage('')
    try {
      const response = await fetch('/api/admin/marketplace-action', { method: 'POST', headers: await adminHeaders(), body: JSON.stringify({ type, id, action }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'We could not save that decision.')
      await loadQueue()
    } catch (error) { setMessage(error.message || 'We could not save that decision.') }
    finally { setBusy('') }
  }
  if (authLoading) return <main className="inner-page"><p className="market-state" role="status">Checking access…</p></main>
  if (!user) return <main className="inner-page"><section className="market-state"><h1>Admin sign in required.</h1><Link className="button button-dark" to="/login">Sign in <span>→</span></Link></section></main>
  if (!isAdmin) return <main className="inner-page"><section className="market-state"><h1>Page not found.</h1><p>This page is not available.</p><Link to="/marketplace">Return to Market Hall <span>→</span></Link></section></main>
  const age = () => 'Awaiting review'
  return <main className="inner-page admin-page"><header className="admin-heading"><div><p className="eyebrow">PRIVATE MARKETPLACE ADMIN</p><h1>Review <em>desk.</em></h1><p>Review seller applications, listings and buyer feedback. Target response: 3 hours; maximum: 48 hours.</p></div><button className="button button-light" onClick={() => void loadQueue()}>Refresh queue ↻</button></header>
    {message && <p className="admin-message" role="status">{message}</p>}
    {state === 'loading' && <p className="market-state" role="status">Loading review queue…</p>}
    {state === 'error' && <section className="market-state"><h2>Review queue unavailable.</h2><p>{message}</p><p>Confirm the latest database migration and the server side Supabase secret are configured.</p><button className="button button-dark" onClick={() => void loadQueue()}>Try again</button></section>}
    {state === 'ready' && <>
      <section className="admin-section"><div className="admin-section-heading"><div><p className="eyebrow">{queue.sellers.length} STORES</p><h2>Seller applications &amp; store reviews</h2></div></div>
        {queue.sellers.length ? <div className="admin-cards">{queue.sellers.map((seller) => <article className="admin-card" key={seller.user_id}><div className="admin-card-top"><div><h3>{seller.store_name}</h3><p>{seller.country_code} · {seller.region} · {seller.status}</p></div><span>{age(seller.review_started_at || seller.created_at)}</span></div><p>{seller.description || 'No store description provided.'}</p>{seller.review_reason && <p className="admin-reason">Review reason: {seller.review_reason.replaceAll('_', ' ')}</p>}<div className="admin-buttons">{(seller.status === 'pending' || seller.status === 'suspended' && seller.review_required) && <><button disabled={busy === `seller:${seller.user_id}`} onClick={() => void act('seller', seller.user_id, 'approve')}>{seller.status === 'pending' ? 'Approve store' : 'Reinstate store'}</button>{seller.status === 'pending' && <button className="secondary" disabled={busy === `seller:${seller.user_id}`} onClick={() => void act('seller', seller.user_id, 'reject')}>Decline</button>}</>}{seller.review_required && seller.status !== 'suspended' && <button disabled={busy === `seller:${seller.user_id}`} onClick={() => void act('seller', seller.user_id, 'resolve')}>Clear store review</button>}</div></article>)}</div> : <p className="admin-empty">No stores need review.</p>}
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><p className="eyebrow">{queue.listings.length} LISTINGS</p><h2>Listing review</h2><p>Auto-review: listings four and five, price above twice the category median, or 10 paid sales in the last 30 days.</p></div></div>
        {queue.listings.length ? <div className="admin-cards">{queue.listings.map((item) => <article className="admin-card" key={item.id}><div className="admin-card-top"><div><h3>{item.title}</h3><p>{item.seller?.store_name || 'Seller'} · {item.category} · {money(item.price, item.currency)}</p></div><span>{age(item.created_at)}</span></div><p>{item.description}</p>{item.review_reason && <p className="admin-reason">Review reason: {item.review_reason.replaceAll('_', ' ')}</p>}<div className="admin-buttons"><button disabled={busy === `listing:${item.id}`} onClick={() => void act('listing', item.id, 'approve')}>Approve listing</button><button className="secondary" disabled={busy === `listing:${item.id}`} onClick={() => void act('listing', item.id, 'reject')}>Reject</button></div></article>)}</div> : <p className="admin-empty">No listings are waiting for approval.</p>}
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><p className="eyebrow">{queue.feedback.length} FEEDBACK</p><h2>Buyer feedback</h2></div></div>
        {queue.feedback.length ? <div className="admin-cards">{queue.feedback.map((entry) => <article className="admin-card" key={entry.id}><div className="admin-card-top"><div><h3>{entry.seller?.store_name || 'Seller'} · {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</h3><p>{new Date(entry.created_at).toLocaleString()}</p></div><span>{age(entry.created_at)}</span></div><p>{entry.comment || 'No written comment.'}</p><div className="admin-buttons"><button onClick={() => void act('feedback', entry.id, 'resolve')}>Resolve feedback review</button></div></article>)}</div> : <p className="admin-empty">No buyer feedback needs review.</p>}
      </section>
    </>}
  </main>
}
