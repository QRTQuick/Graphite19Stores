import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProductImage } from '../components/StoreLayout.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useStore } from '../context/useStore.js'

export default function ProductPage() {
  const { id } = useParams()
  const { products, catalogStatus, addToCart } = useStore()
  const product = products.find((item) => String(item.id) === id)
  const variants = product?.variants || []
  const [selectedId, setSelectedId] = useState(null)
  const selected = variants.find((variant) => String(variant.id) === String(selectedId)) || variants[0]
  const [added, setAdded] = useState(false)
  if (!product && catalogStatus === 'loading') return <LoadingScreen label="Checking the Printify catalog"/>
  if (!product && catalogStatus === 'unavailable') return <main className="inner-page"><div className="empty-page"><p className="eyebrow">CATALOG UNAVAILABLE</p><h1>We can’t check<br/>this <em>piece.</em></h1><p>Please try again when the Printify catalog is available.</p><button className="button button-dark" onClick={() => window.location.reload()}>Try again <span>↻</span></button></div></main>
  if (!product) return <main className="inner-page"><div className="empty-page"><p className="eyebrow">NOT IN THE PRINTIFY SHOP</p><h1>This piece isn’t<br/>available <em>here.</em></h1><Link className="button button-dark" to="/shop">Back to the collection <span>→</span></Link></div></main>
  const add = () => {
    addToCart(product, selected)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2200)
  }
  return <main className="product-page inner-page"><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/shop">Shop</Link><span>/</span><span>{product.title}</span></div><div className="product-detail"><div className="detail-image"><ProductImage product={product} width={1200}/></div><div className="detail-copy"><p className="eyebrow">{product.category || 'GRAPHITE19STORES'}</p><h1>{product.title}</h1><p className="detail-price">${Number(selected?.price ?? product.price).toFixed(2)}</p><p className="detail-description">{product.description || 'A considered everyday piece, made to move with you.'}</p>{variants.length > 0 && <div className="variant-picker"><div><span>Choose an option</span><span>{selected?.title}</span></div><div className="variant-list">{variants.map((variant) => <button key={variant.id} className={String(selected?.id) === String(variant.id) ? 'variant-chip selected' : 'variant-chip'} onClick={() => setSelectedId(variant.id)}>{variant.title}</button>)}</div></div>}<button className="button button-dark add-to-bag" onClick={add}>{added ? 'Added to cart ✓' : 'Add to cart'} <span>→</span></button><div className="detail-assurances"><p>Made to order with care.</p><p>Shipping calculated at checkout.</p><p>Questions? <Link to="/contact">Talk to our team.</Link></p></div></div></div></main>
}
