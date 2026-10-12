import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../components/StoreLayout.jsx'
import { useStore } from '../context/useStore.js'

export default function CheckoutPage() {
  const { cart, changeQuantity } = useStore()
  const [message, setMessage] = useState('')
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const beginPayment = (event) => {
    event.preventDefault()
    setMessage('Your details are ready. Flutterwave payments will be available as soon as secure payment processing is connected.')
  }

  if (!cart.length) return <main className="checkout-page"><section className="checkout-empty"><span className="checkout-kicker">YOUR BAG / 00</span><p className="eyebrow">A LITTLE ROOM FOR SOMETHING GOOD</p><h1>Your bag is <em>waiting.</em></h1><p>There’s nothing in it just yet. Find a piece that feels like you.</p><Link className="button button-dark" to="/shop">Explore the collection <span>→</span></Link></section></main>

  return <main className="checkout-page">
    <div className="checkout-topline"><Link to="/shop" className="checkout-back">← &nbsp;Back to the collection</Link><span className="checkout-secure"><span aria-hidden="true">⌑</span> SECURE CHECKOUT</span></div>
    <section className="checkout-intro"><p className="eyebrow">THE FINAL DETAILS</p><h1>Make it <em>yours.</em></h1><p>Your selection is saved while you check out.</p></section>
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={beginPayment}>
        <section className="checkout-step"><div className="checkout-step-title"><span>01</span><div><h2>Where should we reach you?</h2><p>We’ll use these details for order updates.</p></div></div>
          <div className="checkout-fields"><label className="checkout-field checkout-field-wide">Email address<input type="email" name="email" placeholder="you@example.com" autoComplete="email" required/></label><label className="checkout-field">First name<input name="firstName" placeholder="First name" autoComplete="given-name" required/></label><label className="checkout-field">Last name<input name="lastName" placeholder="Last name" autoComplete="family-name" required/></label><label className="checkout-field checkout-field-wide">Phone number<input type="tel" name="phone" placeholder="+234 800 000 0000" autoComplete="tel" required/></label></div>
        </section>
        <section className="checkout-step"><div className="checkout-step-title"><span>02</span><div><h2>Where should it go?</h2><p>Add the delivery address for your order.</p></div></div>
          <div className="checkout-fields"><label className="checkout-field checkout-field-wide">Street address<input name="address" placeholder="House number and street" autoComplete="street-address" required/></label><label className="checkout-field">City<input name="city" placeholder="City" autoComplete="address-level2" required/></label><label className="checkout-field">State or region<input name="region" placeholder="State or region" autoComplete="address-level1" required/></label><label className="checkout-field checkout-field-wide">Country<select name="country" defaultValue="Nigeria" autoComplete="country-name"><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option><option>United Kingdom</option><option>United States</option><option>Other</option></select></label></div>
        </section>
        <section className="checkout-step payment-step"><div className="checkout-step-title"><span>03</span><div><h2>Payment</h2><p>Secure payment, when Flutterwave is connected.</p></div></div><div className="flutterwave-card"><span className="flutterwave-symbol" aria-hidden="true">F</span><span><strong>Flutterwave</strong><small>Payment options will be shown on the secure payment step.</small></span><span className="payment-lock" aria-hidden="true">⌑</span></div></section>
        {message && <p className="checkout-message" role="status">{message}</p>}
        <button className="checkout-pay" type="submit"><span>Continue with Flutterwave</span><span aria-hidden="true">→</span></button>
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
