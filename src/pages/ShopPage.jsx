import { useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard.jsx'
import { useStore } from '../context/useStore.js'

export default function ShopPage() {
  const { products, catalogStatus } = useStore()
  const [category, setCategory] = useState('All pieces')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')
  const visible = useMemo(() => {
    const matches = products.filter((product) => (category === 'All pieces' || product.category === category) && product.title.toLowerCase().includes(query.toLowerCase()))
    if (sort === 'low') return [...matches].sort((a, b) => a.price - b.price)
    if (sort === 'high') return [...matches].sort((a, b) => b.price - a.price)
    return matches
  }, [products, category, query, sort])
  return <main className="inner-page"><section className="page-heading"><p className="eyebrow">THE GRAPHITE EDIT</p><h1>Shop the <em>collection.</em></h1><p>Custom clothes and face caps for everyday style, at comfortable prices.</p></section><div className="shop-toolbar"><div className="filters" role="group" aria-label="Filter collection">{['All pieces', 'Apparel', 'Objects'].map((item) => <button key={item} className={category === item ? 'filter active' : 'filter'} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="shop-options"><label className="search-field"><span className="sr-only">Search Printify products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection"/></label><label className="sort-label">Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div></div>{catalogStatus === 'loading' && <div className="catalog-state" role="status"><span className="catalog-spinner"/>Loading products from Printify…</div>}{catalogStatus === 'unavailable' && <div className="catalog-state catalog-state-error" role="status"><p>We couldn’t reach your Printify catalog, so products are hidden for now.</p><button className="text-link" onClick={() => window.location.reload()}>Try again <span>↻</span></button></div>}{catalogStatus === 'empty' && <div className="catalog-state"><p>Your Printify shop has no published products to display right now.</p></div>}{catalogStatus === 'live' && visible.length > 0 && <div className="product-grid shop-grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index}/>)}</div>}{catalogStatus === 'live' && visible.length === 0 && <p className="empty-state">No Printify products match those filters.</p>}</main>
}
