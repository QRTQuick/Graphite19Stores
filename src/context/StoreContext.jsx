import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { StoreContext } from './storeContext.js'

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([])
  const [catalogStatus, setCatalogStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('graphite19stores-cart') || '[]') } catch { return [] }
  })
  const [cartNotice, setCartNotice] = useState('')
  const cartNoticeTimer = useRef(null)

  useEffect(() => {
    fetch('/api/products')
      .then(async (response) => {
        if (!response.ok) throw new Error('Printify could not return the live catalog.')
        return response.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Printify returned an invalid product list.')
        setProducts(data)
        setCatalogStatus(data.length ? 'live' : 'empty')
        setCart((items) => items.filter((line) => {
          const product = data.find((item) => String(item.id) === String(line.id))
          if (!product) return false
          return !line.variantId || product.variants?.some((variant) => String(variant.id) === String(line.variantId))
        }))
      })
      .catch(() => {
        setProducts([])
        setCatalogStatus('unavailable')
      })
  }, [])

  useEffect(() => {
    localStorage.setItem('graphite19stores-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAuthLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const addToCart = (product, variant = null) => {
    const key = `${product.id}:${variant?.id || 'default'}`
    const chosen = variant || product.variants?.[0]
    setCart((items) => {
      const match = items.find((item) => item.key === key)
      const line = { key, id: product.id, title: product.title, image: product.image, color: product.color, variantTitle: chosen?.title || '', variantId: chosen?.id || null, price: Number(chosen?.price ?? product.price), quantity: 1 }
      return match ? items.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item) : [...items, line]
    })
    setCartNotice(`${product.title} added to cart`)
    window.clearTimeout(cartNoticeTimer.current)
    cartNoticeTimer.current = window.setTimeout(() => setCartNotice(''), 2800)
  }
  const changeQuantity = (key, amount) => setCart((items) => items.map((item) => item.key === key ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0))
  const clearCart = () => setCart([])

  const visibleCart = useMemo(() => catalogStatus === 'live' ? cart : [], [catalogStatus, cart])
  const value = useMemo(() => ({ products, catalogStatus, user, authLoading, cart: visibleCart, cartNotice, addToCart, changeQuantity, clearCart }), [products, catalogStatus, user, authLoading, visibleCart, cartNotice])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
