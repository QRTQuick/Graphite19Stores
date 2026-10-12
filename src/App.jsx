import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
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

function ProtectedRoute({ children }) {
  const { user, authLoading } = useStore()
  const location = useLocation()
  if (authLoading) return <LoadingScreen label="Loading your account"/>
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }}/>
}

function NotFound() {
  return <main className="inner-page empty-page"><p className="eyebrow">404 / NOT FOUND</p><h1>This page took<br/><em>a different turn.</em></h1><a className="button button-dark" href="/">Back to home <span>→</span></a></main>
}

function PageMetadata() {
  const { pathname } = useLocation()
  const { products } = useStore()
  useEffect(() => {
    const product = pathname.startsWith('/products/') ? products.find((item) => String(item.id) === pathname.split('/')[2]) : null
    const titles = {
      '/': 'Graphite19Stores — Objects for Every Day',
      '/shop': 'Shop the Collection — Graphite19Stores',
      '/about': 'Our Approach — Graphite19Stores',
      '/contact': 'Contact — Graphite19Stores',
      '/faq': 'FAQs — Graphite19Stores',
      '/login': 'Sign In — Graphite19Stores',
      '/signup': 'Create an Account — Graphite19Stores',
      '/reset-password': 'Reset Your Password — Graphite19Stores',
      '/account': 'Your Account — Graphite19Stores',
      '/checkout': 'Your Bag — Graphite19Stores',
      '/privacy': 'Privacy — Graphite19Stores',
      '/terms': 'Terms — Graphite19Stores',
    }
    document.title = product ? `${product.title} — Graphite19Stores` : titles[pathname] || 'Graphite19Stores'
    const description = product?.description || 'Thoughtfully designed apparel and useful everyday objects from Graphite19Stores.'
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, products])
  return null
}

function SiteRoutes() {
  return <><PageMetadata/><Suspense fallback={<LoadingScreen/>}><Routes><Route element={<StoreLayout/>}>
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
    <Route path="checkout" element={<CheckoutPage/>}/>
    <Route path="privacy" element={<LegalPage type="privacy"/>}/>
    <Route path="terms" element={<LegalPage type="terms"/>}/>
    <Route path="*" element={<NotFound/>}/>
  </Route></Routes></Suspense></>
}

export default function App() {
  return <BrowserRouter><StoreProvider><SiteRoutes/></StoreProvider></BrowserRouter>
}
