export default function LoadingScreen({ label = 'Loading your next good thing' }) {
  return <main className="loading-screen" role="status" aria-live="polite" aria-label={label}>
    <div className="loading-orbit"><span className="loading-mark">G<span>19</span></span><i/><i/><i/></div>
    <p className="loading-brand">GRAPHITE<span>19</span>STORES</p>
    <div className="loading-track" aria-hidden="true"><span/></div>
    <span className="sr-only">{label}…</span>
  </main>
}
