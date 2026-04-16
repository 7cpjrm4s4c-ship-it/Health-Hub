import { useEffect, useRef } from 'react'
import { Activity, Calendar, Thermometer, TrendingUp, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUIStore, type TabId } from '../../stores/ui'
import './PillNav.css'

interface TabDef { id: TabId; label: string; Icon: LucideIcon }

const TABS: TabDef[] = [
  { id: 'today',    label: 'Heute',    Icon: Activity    },
  { id: 'calendar', label: 'Kalender', Icon: Calendar    },
  { id: 'illness',  label: 'Krank',    Icon: Thermometer },
  { id: 'analysis', label: 'Analyse',  Icon: TrendingUp  },
  { id: 'history',  label: 'Verlauf',  Icon: Clock       },
]

const ITEM_W   = 68
const ITEM_GAP = 4

export function PillNav() {
  const { activeTab, setActiveTab } = useUIStore()
  const activeIndex  = TABS.findIndex(t => t.id === activeTab)
  const highlightRef = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout>>()

  // Conditional will-change: activate only during the 280ms transition window
  useEffect(() => {
    const el = highlightRef.current
    if (!el) return
    clearTimeout(timerRef.current)
    el.classList.add('pill-nav__highlight--animating')
    timerRef.current = setTimeout(() => {
      el.classList.remove('pill-nav__highlight--animating')
    }, 310)
    return () => clearTimeout(timerRef.current)
  }, [activeIndex])

  const highlightX = activeIndex * (ITEM_W + ITEM_GAP)

  return (
    <nav className="pill-nav" role="tablist" aria-label="Navigation">
      <div
        ref={highlightRef}
        className="pill-nav__highlight"
        style={{ transform: `translateX(${highlightX}px)` }}
        aria-hidden="true"
      />

      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            className={`pill-nav__item ${isActive ? 'pill-nav__item--active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={18} className="pill-nav__icon" />
            <span className="pill-nav__label" aria-hidden={!isActive}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
