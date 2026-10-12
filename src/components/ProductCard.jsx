import { Link } from 'react-router-dom'
import { useStore } from '../context/useStore.js'
import { ProductImage } from './StoreLayout.jsx'
import { getStartingPrice, hasVariantPriceDifferences } from '../lib/pricing.js'

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useStore()
  const startingPrice = getStartingPrice(product)
  const hasDifferentPrices = hasVariantPriceDifferences(product)
  return <article className="product-card" style={{ '--delay': `${index * 70}ms` }}><div className="product-image-wrap"><Link to={`/products/${product.id}`} aria-label={`View ${product.title}`}><ProductImage product={product} loading="lazy"/></Link>{product.badge && <span className="product-badge">{product.badge}</span>}<button className="quick-add" aria-label={`Add ${product.title} from $${startingPrice.toFixed(2)} to bag`} onClick={() => addToCart(product)}><span aria-hidden="true">+</span><span className="sr-only">Add to bag</span></button></div><div className="product-info"><div><Link to={`/products/${product.id}`}><h3>{product.title}</h3></Link><p>{product.color || product.category}</p></div><span className="price">{hasDifferentPrices ? 'From ' : ''}${startingPrice.toFixed(2)}</span></div></article>
}
