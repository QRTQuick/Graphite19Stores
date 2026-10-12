import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProductImage } from '../components/StoreLayout.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useStore } from '../context/useStore.js'

function optionValue(variant, name) {
  return variant?.optionValues?.[name] || null
}

export default function ProductPage() {
  const { id } = useParams()
  const { products, catalogStatus, refreshCatalog, addToCart } = useStore()
  const product = products.find((item) => String(item.id) === id)
  const variants = product?.variants || []
  const [selectedId, setSelectedId] = useState(null)
  const selected = variants.find((variant) => String(variant.id) === String(selectedId)) || variants[0]
  const [added, setAdded] = useState(false)
  const colorOptionName = product?.colorOptionName
  const sizeOptionName = product?.sizeOptionName
  const colorOption = product?.variantOptions?.find((option) => option.name === colorOptionName)
  const sizeOption = product?.variantOptions?.find((option) => option.name === sizeOptionName)
  const selectedColor = optionValue(selected, colorOptionName)
  const selectedSize = optionValue(selected, sizeOptionName)

  if (!product && catalogStatus === 'loading') return <LoadingScreen label="Checking the Printify catalog"/>
  if (!product && catalogStatus === 'unavailable') return <main className="inner-page"><div className="empty-page error-page"><p className="eyebrow">A QUICK PAUSE</p><h1>We couldn’t load<br/>this <em>piece.</em></h1><p>Please try again in a moment.</p><button className="button button-dark" onClick={refreshCatalog}>Try again <span>↻</span></button></div></main>
  if (!product) return <main className="inner-page"><div className="empty-page"><p className="eyebrow">404 / NOT FOUND</p><h1>This piece isn’t<br/>available <em>here.</em></h1><Link className="button button-dark" to="/shop">Back to the collection <span>→</span></Link></div></main>

  const chooseOption = (optionName, value) => {
    const matches = variants.filter((variant) => optionValue(variant, optionName)?.id === value.id)
    const preferred = matches.find((variant) => [colorOptionName, sizeOptionName]
      .filter((name) => name && name !== optionName)
      .every((name) => optionValue(variant, name)?.id === optionValue(selected, name)?.id))
    setSelectedId((preferred || matches[0])?.id ?? null)
  }

  const add = () => {
    addToCart(product, selected)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2200)
  }

  const description = (product.description || 'A considered everyday piece, made to move with you.')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return <main className="product-page inner-page">
    <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/shop">Shop</Link><span>/</span><span>{product.title}</span></div>
    <div className="product-detail">
      <div className="detail-image"><ProductImage product={{ ...product, image: selected?.image || product.image }} width={1200}/></div>
      <div className="detail-copy">
        <p className="eyebrow">{product.category || 'GRAPHITE19STORES'}</p>
        <h1>{product.title}</h1>
        <p className="detail-price">${Number(selected?.price ?? product.price).toFixed(2)}</p>
        <p className="detail-description">{description}</p>
        {colorOption && <section className="variant-picker" aria-label="Choose a color">
          <div className="variant-label"><span>Color</span><span>{selectedColor?.title || 'Select a color'}</span></div>
          <div className="color-list" role="group" aria-label="Available colors">
            {colorOption.values.map((value) => {
              const available = variants.some((variant) => optionValue(variant, colorOptionName)?.id === value.id)
              const isSelected = selectedColor?.id === value.id
              return <button key={value.id} type="button" className={`color-swatch${isSelected ? ' selected' : ''}`} style={value.colorHex ? { '--swatch-color': value.colorHex } : undefined} aria-label={`Choose ${value.title}`} aria-pressed={isSelected} title={value.title} disabled={!available} onClick={() => chooseOption(colorOptionName, value)}>
                {value.colorHex ? <span aria-hidden="true"/> : <span className="color-swatch-name">{value.title}</span>}
              </button>
            })}
          </div>
        </section>}
        {sizeOption && <section className="variant-picker" aria-label="Choose a size">
          <div className="variant-label"><span>Size</span><span>{selectedSize?.title || 'Select a size'}</span></div>
          <div className="variant-list" role="group" aria-label="Available sizes">
            {sizeOption.values.map((value) => {
              const matchingVariant = variants.find((variant) => optionValue(variant, sizeOptionName)?.id === value.id && (!selectedColor || optionValue(variant, colorOptionName)?.id === selectedColor.id))
              const isSelected = selectedSize?.id === value.id
              return <button key={value.id} type="button" className={`variant-chip${isSelected ? ' selected' : ''}`} aria-pressed={isSelected} disabled={!matchingVariant} onClick={() => matchingVariant && chooseOption(sizeOptionName, value)}>{value.title}</button>
            })}
          </div>
        </section>}
        {!colorOption && !sizeOption && variants.length > 0 && <section className="variant-picker">
          <div className="variant-label"><span>Choose an option</span><span>{selected?.title}</span></div>
          <div className="variant-list">{variants.map((variant) => <button key={variant.id} type="button" className={`variant-chip${String(selected?.id) === String(variant.id) ? ' selected' : ''}`} aria-pressed={String(selected?.id) === String(variant.id)} onClick={() => setSelectedId(variant.id)}>{variant.title}</button>)}</div>
        </section>}
        <button className="button button-dark add-to-bag" disabled={!selected || added} onClick={add}>{added ? 'Added to cart ✓' : 'Add to cart'} <span>→</span></button>
        <div className="detail-assurances"><p>Made to order with care.</p><p>Shipping calculated at checkout.</p><p>Questions? <Link to="/contact">Talk to our team.</Link></p></div>
      </div>
    </div>
  </main>
}
