import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../context/useStore.js'
import { supabase } from '../lib/supabase.js'

function Icon({ name, size = 19 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'close') return <svg {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>
  if (name === 'plus') return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>
  if (name === 'minus') return <svg {...props}><path d="M5 12h14"/></svg>
  return <svg {...props}><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
}

export function ProductImage({ product, width = 760, ...props }) {
  const src = product?.image?.startsWith('http')
    ? product.image
    : `https://images.unsplash.com/${product?.image || 'photo-1521572163474-6864f9cf17ab'}?auto=format&fit=crop&w=${width}&q=85`
  const [loadedSrc, setLoadedSrc] = useState('')
  const [failedSrc, setFailedSrc] = useState('')
  const isLoading = loadedSrc !== src && failedSrc !== src
  return <span className={`product-image-frame${isLoading ? ' is-loading' : ''}${failedSrc === src ? ' has-error' : ''}`}>
    <img src={src} alt={product?.title || ''} onLoad={() => setLoadedSrc(src)} onError={() => setFailedSrc(src)} {...props}/>
    {isLoading && <span className="image-loading-indicator" role="status" aria-live="polite"><span className="sr-only">Loading {product?.title || 'product'} image</span><span className="image-loading-mark" aria-hidden="true"><i/><svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 4"/></svg></span></span>}
    {failedSrc === src && <span className="image-loading-indicator image-load-failed" aria-hidden="true"><span className="image-loading-mark"><svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 4"/></svg></span></span>}
  </span>
}

function CartDrawer({ onClose }) {
  const { cart, changeQuantity } = useStore()
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0)
  return <div className="drawer-backdrop" onClick={onClose}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()} aria-label="Shopping bag"><div className="drawer-head"><div><p className="eyebrow">YOUR SELECTION</p><h2>Your bag <span>({cart.reduce((sum, line) => sum + line.quantity, 0)})</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Close bag"><Icon name="close"/></button></div>{cart.length ? <><div className="cart-items">{cart.map((line) => <div className="cart-item" key={line.key}><ProductImage product={line} width={220}/><div className="cart-item-detail"><h3>{line.title}</h3><p>{line.variantTitle || line.color}</p><div className="quantity"><button onClick={() => changeQuantity(line.key, -1)} aria-label="Remove one"><Icon name="minus" size={14}/></button><span>{line.quantity}</span><button onClick={() => changeQuantity(line.key, 1)} aria-label="Add one"><Icon name="plus" size={14}/></button></div></div><b>${(line.price * line.quantity).toFixed(2)}</b></div>)}</div><div className="drawer-total"><div><span>Subtotal</span><b>${subtotal.toFixed(2)}</b></div><p>Shipping and taxes calculated at checkout.</p><Link className="button button-dark checkout" to="/checkout" onClick={onClose}>Continue to checkout <span>→</span></Link></div></> : <div className="cart-empty"><div className="empty-icon"><Icon name="bag" size={25}/></div><h3>Your bag is taking it slow.</h3><p>Find a few things that feel like you.</p><Link className="button button-dark" to="/shop" onClick={onClose}>Explore the collection <span>→</span></Link></div>}</aside></div>
}

export default function StoreLayout() {
  const { user, cart, cartNotice } = useStore()
  const isMarketplaceAdmin = String(user?.email || '').toLowerCase() === 'graphite19stores@gmail.com'
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const count = cart.reduce((sum, line) => sum + line.quantity, 0)
  const handleSignOut = async () => {
    await supabase?.auth.signOut()
    setNotice('You are signed out.')
    window.setTimeout(() => setNotice(''), 2500)
  }
  const closeMobile = () => setMobileOpen(false)
  return <>
    <div className="announcement">A marketplace for independent finds. <Link to="/marketplace">Explore the marketplace <span>↗</span></Link></div>
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="Graphite19Stores home"><span className="mark">G<span>19</span></span><span className="wordmark-name">GRAPHITE<span>19</span><small>STORES</small></span></Link>
      <nav className={mobileOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation"><NavLink to="/marketplace" onClick={closeMobile}>Market Hall</NavLink><NavLink to="/shop" onClick={closeMobile}>Graphite19 label</NavLink><NavLink to="/sell" onClick={closeMobile}>Sell with us</NavLink></nav>
      <div className="header-actions">{user ? <><Link className="account-link" to="/account">My account</Link><Link className="account-link" to="/orders">Orders</Link>{isMarketplaceAdmin && <Link className="account-link" to="/admin">Admin</Link>}<button className="account-link signout-link" onClick={handleSignOut}>Sign out</button></> : <Link className="account-link" to="/login">Log in</Link>}<button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}><Icon name="bag"/><span>Bag</span><b>{count}</b></button><button className="mobile-menu" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>☰</button></div>
    </header>
    <Outlet/>
    <footer className="site-footer"><div className="footer-top"><Link className="wordmark footer-mark" to="/"><span className="mark">G<span>19</span></span><span className="wordmark-name">GRAPHITE<span>19</span><small>STORES</small></span></Link><p>Independent stores.<br/>Everyday discoveries.</p><div className="footer-links"><div><span>EXPLORE</span><Link to="/marketplace">Market Hall</Link><Link to="/shop">Graphite19 label</Link><Link to="/sell">Become a seller</Link><Link to="/seller-terms">Seller terms</Link></div><div><span>GET IN TOUCH</span><Link to="/faq">FAQs</Link><Link to="/contact">Contact</Link><a href="mailto:graphite19stores@gmail.com">graphite19stores@gmail.com ↗</a></div></div></div><div className="footer-bottom"><span>© 2026 Graphite19Stores. All rights reserved.</span><span>Designed &amp; built by <a href="https://quickredtech.com" target="_blank" rel="noreferrer">QuickRedTech</a></span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></div></footer>
    {(cartNotice || notice) && <div className="toast" role="status"><span className="toast-check" aria-hidden="true">✓</span>{cartNotice || notice}</div>}
    {cartOpen && <CartDrawer onClose={() => setCartOpen(false)}/>}
  </>
}
