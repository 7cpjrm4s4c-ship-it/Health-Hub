import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { Header }    from './components/ui/Header'
import { PillNav }   from './components/ui/PillNav'
import { SyncToast } from './components/ui/SyncToast'
import { useUIStore }                      from './stores/ui'
import { useSettingsStore, seedDemoData }  from './stores/settings'
import { useBaselineStore }                from './stores/baseline'
import { processSyncURL, type SyncResult } from './services/shortcuts'
import type { TabId } from './stores/ui'
import Today from './tabs/Today'   // eager – initial tab

const Calendar = lazy(() => import('./tabs/Calendar'))
const Illness  = lazy(() => import('./tabs/Illness'))
const Analysis = lazy(() => import('./tabs/Analysis'))
const History  = lazy(() => import('./tabs/History'))

import './styles/reset.css'
import './App.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_KEY      = 'hh_seeded'
const SYNC_ID_KEY   = 'hh_last_sync_id'   // sessionStorage – prevents duplicate import on restore

// Tabs whose state & scroll position should be preserved once visited
const KEEP_MOUNTED: TabId[] = ['calendar', 'analysis']

// ─── Component ────────────────────────────────────────────────────────────────

function TabFallback() {
  return <div className="tab-loading" aria-label="Lädt…" />
}

export default function App() {
  const { activeTab, initTheme }    = useUIStore()
  const { init: initSettings }      = useSettingsStore()
  const { recalculate, loadToday }  = useBaselineStore()
  const seeding                     = useRef(false)

  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  // Track which lazy tabs have been visited → keepMounted tabs stay in DOM
  const [visited, setVisited] = useState<Set<TabId>>(new Set(['today']))

  useEffect(() => {
    if (!visited.has(activeTab)) {
      setVisited(prev => new Set([...prev, activeTab]))
    }
  }, [activeTab])

  useEffect(() => {
    initTheme()
    initSettings()

    // ── Seed guard ──────────────────────────────────────────────────────────
    // Uses both seeding.current (in-memory) and localStorage 'pending' flag
    // to survive StrictMode double-mount, Hot Reload, and Safari restore.
    const flag = localStorage.getItem(SEED_KEY)
    if (!flag && !seeding.current) {
      seeding.current = true
      localStorage.setItem(SEED_KEY, 'pending')
      seedDemoData()
        .then(() => {
          localStorage.setItem(SEED_KEY, '1')
          seeding.current = false   // ← lifecycle cleanup
        })
        .catch(() => {
          localStorage.removeItem(SEED_KEY)
          seeding.current = false   // ← allow retry on next launch
        })
    }

    // ── Shortcuts Bridge sync ───────────────────────────────────────────────
    // sessionStorage guard: processSyncURL() strips query params from the URL
    // immediately, but Safari standalone PWA can restore the previous URL state
    // from Back/Forward cache or App Switcher. The sync ID prevents re-importing
    // the same dataset on every restore.
    processSyncURL().then(result => {
      if (!result) return

      if (result.success) {
        // Build a deterministic sync ID from date + imported count
        const syncId = `${result.date}:${result.imported}`
        const lastId = sessionStorage.getItem(SYNC_ID_KEY)

        if (syncId === lastId) return   // already imported this dataset this session
        sessionStorage.setItem(SYNC_ID_KEY, syncId)

        recalculate().then(() => loadToday())
      }

      setSyncResult(result)
    })
  }, [])

  // ── Slot renderer ─────────────────────────────────────────────────────────
  // - Today: always mounted (eager)
  // - KEEP_MOUNTED tabs: mounted once visited, hidden via CSS when not active
  // - Other tabs: unmounted when not active (saves memory)
  function slot(id: TabId, children: React.ReactNode) {
    const isActive  = activeTab === id
    const keep      = KEEP_MOUNTED.includes(id)
    const shouldRender = isActive || (keep && visited.has(id))

    return (
      <div
        key={id}
        className={`tab-slot ${keep ? 'tab-slot--keep' : ''}`}
        data-active={isActive}
        aria-hidden={!isActive}
      >
        {shouldRender ? children : null}
      </div>
    )
  }

  return (
    <div className="app app-bg">
      <Header />

      <main className="app-content" role="main">
        <div className="tab-wrapper">

          {/* Today – always mounted, never lazy */}
          <div className="tab-slot tab-slot--today" data-active={activeTab === 'today'} aria-hidden={activeTab !== 'today'}>
            <Today />
          </div>

          {/* Lazy tabs */}
          <Suspense fallback={<TabFallback />}>
            {slot('calendar', <Calendar />)}
            {slot('illness',  <Illness  />)}
            {slot('analysis', <Analysis />)}
            {slot('history',  <History  />)}
          </Suspense>

        </div>
      </main>

      <PillNav />

      {syncResult && (
        <SyncToast
          result={syncResult}
          onDone={() => setSyncResult(null)}
        />
      )}
    </div>
  )
}
