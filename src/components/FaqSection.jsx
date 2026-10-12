import { Link } from 'react-router-dom'

const questions = [
  ['What can I find on Graphite19Stores?', 'Shop the Graphite19 clothing label or browse independent marketplace sellers offering clothes, cars, PCs, watches and more.'],
  ['Who sells marketplace listings?', 'Independent sellers apply for a store and listings are reviewed before they appear publicly. Ask a seller questions from the listing page before making arrangements.'],
  ['When will marketplace checkout and delivery be available?', 'Marketplace checkout, delivery coordination and seller payouts are still being configured. Do not send payment for marketplace listings through this site until checkout is announced as available.'],
  ['How are Graphite19 label products made?', 'The Graphite19 label collection is made to order through our fulfilment partner. Product availability and options are shown on each product page.'],
  ['Can I change or cancel an order?', 'Because items are made to order, contact us as soon as possible and include your order details so we can check what is possible.'],
  ['How will I pay?', 'Checkout will be enabled after Flutterwave payment verification and seller settlement are configured. You will see payment options only after secure processing is available.'],
]

export default function FaqSection({ compact = false }) {
  return <section className={`faq-section${compact ? ' faq-compact' : ''}`} aria-labelledby="faq-title">
    <div className="faq-heading"><p className="eyebrow">A FEW HELPFUL DETAILS</p><h2 id="faq-title">Good to <em>know.</em></h2><p>Quick answers to common questions.</p>{compact && <Link className="text-link" to="/faq">More questions <span>→</span></Link>}</div>
    <div className="faq-list">{questions.map(([question, answer], index) => <details className="faq-item" key={question}><summary><span className="faq-number">0{index + 1}</span><span>{question}</span><span className="faq-toggle" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
  </section>
}
