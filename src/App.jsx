import { Component, lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './pages.css'
import StoreLayout from './components/StoreLayout.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import { useStore } from './context/useStore.js'
import LoadingScreen from './components/LoadingScreen.jsx'
import { supabase } from './lib/supabase.js'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const ShopPage = lazy(() => import('./pages/ShopPage.jsx'))
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'))
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'))
const AboutPage = lazy(() => import('./pages/ContentPages.jsx').then((module) => ({ default: module.AboutPage })))
const ContactPage = lazy(() => import('./pages/ContentPages.jsx').then((module) => ({ default: module.ContactPage })))
const LegalPage = lazy(() => import('./pages/ContentPages.jsx').then((module) => ({ default: module.LegalPage })))
const FAQPage = lazy(() => import('./pages/ContentPages.jsx').then((module) => ({ default: module.FAQPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'))
const MarketplacePage = lazy(() => import('./pages/MarketplacePages.jsx').then((module) => ({ default: module.MarketplacePage })))
const MarketplaceListingPage = lazy(() => import('./pages/MarketplacePages.jsx').then((module) => ({ default: module.MarketplaceListingPage })))
const SellerPage = lazy(() => import('./pages/MarketplacePages.jsx').then((module) => ({ default: module.SellerPage })))
const MarketplaceCheckoutPage = lazy(() => import('./pages/MarketplaceCheckoutPages.jsx').then((module) => ({ default: module.MarketplaceCheckoutPage })))
const PaymentResultPage = lazy(() => import('./pages/MarketplaceCheckoutPages.jsx').then((module) => ({ default: module.PaymentResultPage })))
const BuyerOrdersPage = lazy(() => import('./pages/MarketplaceCheckoutPages.jsx').then((module) => ({ default: module.BuyerOrdersPage })))

function ProtectedRoute({ children, checkout = false }) {
  const { user, authLoading } = useStore()
  const location = useLocation()
  if (authLoading) return <LoadingScreen label="Loading your account"/>
  const returnTo = `${location.pathname}${location.search}`
  if (!user) return <Navigate to="/login" replace state={{ from: returnTo, checkoutRequired: checkout }}/>
  const phone = String(user.user_metadata?.phone || '').trim()
  const countryCode = String(user.user_metadata?.country_code || '').trim()
  if (checkout && (phone.replace(/\D/g, '').length < 7 || !/^[A-Z]{2}$/.test(countryCode))) return <Navigate to="/account" replace state={{ from: returnTo, requireProfile: true }}/>
  return children
}

function NotFound() {
  return <main className="inner-page empty-page error-page"><div className="error-mark" aria-hidden="true">404</div><p className="eyebrow">NOT FOUND</p><h1>This page took<br/><em>a different turn.</em></h1><p>Let’s get you back to something good.</p><Link className="button button-dark" to="/">Back to home <span>→</span></Link></main>
}

class PageErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="inner-page empty-page error-page" role="alert"><div className="error-mark" aria-hidden="true">G19</div><p className="eyebrow">A QUICK PAUSE</p><h1>Something didn’t<br/>load <em>quite right.</em></h1><p>Your bag and account are safe. Please try again.</p><div className="error-actions"><button className="button button-dark" onClick={() => window.location.reload()}>Try again <span>↻</span></button><Link className="button button-light" to="/">Back to home <span>→</span></Link></div></main>
  }
}

function PageMetadata() {
  const { pathname } = useLocation()
  const { products } = useStore()
  useEffect(() => {
    const product = pathname.startsWith('/products/') ? products.find((item) => String(item.id) === pathname.split('/')[2]) : null
    const titles = {
      '/': 'Market Hall | Graphite19Stores',
      '/shop': 'Shop Custom Clothes & Face Caps | Graphite19Stores',
      '/marketplace': 'Market Hall | Clothes, Cars, PCs & Watches | Graphite19Stores',
      '/sell': 'Sell on Graphite19Stores | Open a Seller Store',
      '/seller-terms': 'Seller Terms | Graphite19Stores Marketplace',
      '/about': 'About Graphite19Stores | Custom Clothing Designed in Lagos',
      '/contact': 'Contact Graphite19Stores | Customer Support',
      '/faq': 'FAQs — Graphite19Stores',
      '/login': 'Sign In — Graphite19Stores',
      '/signup': 'Create an Account — Graphite19Stores',
      '/reset-password': 'Reset Your Password — Graphite19Stores',
      '/account': 'Your Account — Graphite19Stores',
      '/orders': 'Your Marketplace Orders | Graphite19Stores',
      '/checkout': 'Your Bag — Graphite19Stores',
      '/privacy': 'Privacy — Graphite19Stores',
      '/terms': 'Terms — Graphite19Stores',
    }
    const descriptions = {
      '/': 'Visit the Graphite19Stores Market Hall to discover clothes, cars, computers, watches and other finds from independent sellers.',
      '/shop': 'Explore custom clothing, graphic apparel and face caps from Graphite19Stores. Find everyday styles at comfortable prices.',
      '/marketplace': 'Discover clothes, cars, computers, watches and other finds from independent Graphite19Stores marketplace sellers.',
      '/sell': 'Apply to sell clothes, cars, computers, watches and other products on the Graphite19Stores marketplace.',
      '/about': 'Meet Graphite19Stores, a Lagos-based brand creating custom clothes and face caps for everyday style.',
      '/contact': 'Get in touch with Graphite19Stores for help with custom clothing, face caps, products and orders.',
      '/faq': 'Find answers about Graphite19Stores custom clothes, face caps, shipping, orders and payment.',
      '/privacy': 'Read how Graphite19Stores handles account and customer information.',
      '/terms': 'Read the terms for shopping with Graphite19Stores.',
    }
    const productDescription = product?.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155)
    const title = product ? `${product.title} | Graphite19Stores` : titles[pathname] || 'Page not found | Graphite19Stores'
    const description = productDescription || descriptions[pathname] || 'Discover clothes, cars, computers, watches and other finds at the Graphite19Stores Market Hall.'
    const canonicalUrl = `https://graphite19-stores.vercel.app${pathname}`
    const privatePath = ['/login', '/signup', '/reset-password', '/account', '/checkout', '/orders', '/payment/return'].includes(pathname) || pathname.startsWith('/marketplace/checkout/')
    const robots = (!product && !titles[pathname]) || privatePath ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', robots)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', product?.image?.startsWith('http') ? product.image : 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85')
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
    let productSchema = document.getElementById('page-product-schema')
    if (product) {
      if (!productSchema) {
        productSchema = document.createElement('script')
        productSchema.id = 'page-product-schema'
        productSchema.type = 'application/ld+json'
        document.head.append(productSchema)
      }
      productSchema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description,
        image: product.image,
        sku: String(product.id),
        brand: { '@type': 'Brand', name: 'Graphite19Stores' },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'USD',
          price: Number(product.price || 0).toFixed(2),
          availability: product.variants?.length ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      }).replaceAll('<', '\\u003c')
    } else {
      productSchema?.remove()
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, products])
  return null
}

function newVisitSessionId() {
  return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

function SiteVisitTracker() {
  const { pathname } = useLocation()
  const lastRecordedPath = useRef('')

  useEffect(() => {
    if (lastRecordedPath.current === pathname) return
    lastRecordedPath.current = pathname
    if (!supabase) return

    try {
      let sessionId = window.sessionStorage.getItem('g19-analytics-session')
      if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
        sessionId = newVisitSessionId()
        window.sessionStorage.setItem('g19-analytics-session', sessionId)
      }
      void supabase.from('site_page_views').insert({
        session_id: sessionId,
        page_path: pathname.slice(0, 300),
      }).then(({ error }) => {
        if (error) throw error
      }).catch(() => {})
    } catch {
      // Analytics must never interrupt the storefront if browser storage is unavailable.
    }
  }, [pathname])

  return null
}

function SiteRoutes() {
  const location = useLocation()
  return <><PageMetadata/><PageErrorBoundary key={location.pathname}><Suspense fallback={<LoadingScreen/>}><div className="page-transition" key={location.pathname}><Routes><Route element={<StoreLayout/>}>
    <Route index element={<HomePage/>}/>
    <Route path="shop" element={<ShopPage/>}/>
    <Route path="marketplace" element={<MarketplacePage/>}/>
    <Route path="marketplace/listing/:id" element={<MarketplaceListingPage/>}/>
    <Route path="marketplace/checkout/:id" element={<ProtectedRoute checkout><MarketplaceCheckoutPage/></ProtectedRoute>}/>
    <Route path="payment/return" element={<ProtectedRoute><PaymentResultPage/></ProtectedRoute>}/>
    <Route path="orders" element={<ProtectedRoute><BuyerOrdersPage/></ProtectedRoute>}/>
    <Route path="sell" element={<SellerPage/>}/>
    <Route path="seller-terms" element={<LegalPage type="seller"/>}/>
    <Route path="products/:id" element={<ProductPage/>}/>
    <Route path="about" element={<AboutPage/>}/>
    <Route path="contact" element={<ContactPage/>}/>
    <Route path="faq" element={<FAQPage/>}/>
    <Route path="login" element={<AuthPage mode="login"/>}/>
    <Route path="signup" element={<AuthPage mode="signup"/>}/>
    <Route path="reset-password" element={<AuthPage mode="reset"/>}/>
    <Route path="account" element={<ProtectedRoute><AccountPage/></ProtectedRoute>}/>
    <Route path="checkout" element={<ProtectedRoute checkout><CheckoutPage/></ProtectedRoute>}/>
    <Route path="privacy" element={<LegalPage type="privacy"/>}/>
    <Route path="terms" element={<LegalPage type="terms"/>}/>
    <Route path="*" element={<NotFound/>}/>
  </Route></Routes></div></Suspense></PageErrorBoundary></>
}

export default function App() {
  return <BrowserRouter><StoreProvider><SiteVisitTracker/><SiteRoutes/><Analytics/></StoreProvider></BrowserRouter>
}
