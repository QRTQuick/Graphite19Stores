import { Link } from 'react-router-dom'

const questions = [
  ['How are Graphite19Stores products made?', 'Our collection is made to order through our fulfilment partner. Product availability and options are shown on each product page.'],
  ['When will my order arrive?', 'Delivery estimates depend on your location and the item. We’ll show shipping details before payment is connected.'],
  ['Can I change or cancel an order?', 'Because items are made to order, contact us as soon as possible and include your order details so we can check what is possible.'],
  ['How will I pay?', 'Checkout is being prepared for Flutterwave. You’ll see the available payment methods once secure payment processing is enabled.'],
]

export default function FaqSection({ compact = false }) {
  return <section className={`faq-section${compact ? ' faq-compact' : ''}`} aria-labelledby="faq-title">
    <div className="faq-heading"><p className="eyebrow">A FEW HELPFUL DETAILS</p><h2 id="faq-title">Good to <em>know.</em></h2><p>Quick answers to common questions.</p>{compact && <Link className="text-link" to="/faq">More questions <span>→</span></Link>}</div>
    <div className="faq-list">{questions.map(([question, answer], index) => <details className="faq-item" key={question}><summary><span className="faq-number">0{index + 1}</span><span>{question}</span><span className="faq-toggle" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
  </section>
}
