import { Component, lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './pages.css'
import StoreLayout from './components/StoreLayout.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import { useStore } from './context/useStore.js'
import LoadingScreen from './components/LoadingScreen.jsx'

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

function ProtectedRoute({ children, checkout = false }) {
  const { user, authLoading } = useStore()
  const location = useLocation()
  if (authLoading) return <LoadingScreen label="Loading your account"/>
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname, checkoutRequired: checkout }}/>
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
      '/': 'Custom Clothes & Face Caps | Graphite19Stores',
      '/shop': 'Shop Custom Clothes & Face Caps | Graphite19Stores',
      '/about': 'About Graphite19Stores | Custom Clothing Designed in Lagos',
      '/contact': 'Contact Graphite19Stores | Customer Support',
      '/faq': 'FAQs — Graphite19Stores',
      '/login': 'Sign In — Graphite19Stores',
      '/signup': 'Create an Account — Graphite19Stores',
      '/reset-password': 'Reset Your Password — Graphite19Stores',
      '/account': 'Your Account — Graphite19Stores',
      '/checkout': 'Your Bag — Graphite19Stores',
      '/privacy': 'Privacy — Graphite19Stores',
      '/terms': 'Terms — Graphite19Stores',
    }
    const descriptions = {
      '/': 'Shop custom clothes, everyday streetwear and face caps at comfortable prices. Discover fresh designs from Graphite19Stores, designed in Lagos.',
      '/shop': 'Explore custom clothing, graphic apparel and face caps from Graphite19Stores. Find everyday styles at comfortable prices.',
      '/about': 'Meet Graphite19Stores, a Lagos-based brand creating custom clothes and face caps for everyday style.',
      '/contact': 'Get in touch with Graphite19Stores for help with custom clothing, face caps, products and orders.',
      '/faq': 'Find answers about Graphite19Stores custom clothes, face caps, shipping, orders and payment.',
      '/privacy': 'Read how Graphite19Stores handles account and customer information.',
      '/terms': 'Read the terms for shopping with Graphite19Stores.',
    }
    const productDescription = product?.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155)
    const title = product ? `${product.title} | Graphite19Stores` : titles[pathname] || 'Page not found | Graphite19Stores'
    const description = productDescription || descriptions[pathname] || 'Shop custom clothes and face caps at comfortable prices from Graphite19Stores.'
    const canonicalUrl = `https://graphite19-stores.vercel.app${pathname}`
    const privatePath = ['/login', '/signup', '/reset-password', '/account', '/checkout'].includes(pathname)
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

function SiteRoutes() {
  const location = useLocation()
  return <><PageMetadata/><PageErrorBoundary key={location.pathname}><Suspense fallback={<LoadingScreen/>}><div className="page-transition" key={location.pathname}><Routes><Route element={<StoreLayout/>}>
    <Route index element={<HomePage/>}/>
    <Route path="shop" element={<ShopPage/>}/>
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
  return <BrowserRouter><StoreProvider><SiteRoutes/></StoreProvider></BrowserRouter>
}
