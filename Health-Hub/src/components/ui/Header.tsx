import { useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { SettingsDrawer } from './SettingsDrawer'
import './Header.css'

export function Header() {
  const { settingsOpen, headerHidden, openSettings, closeSettings } = useUIStore()
  const headerRef   = useRef<HTMLElement>(null)
  const prevHidden  = useRef(false)

  // Add animating class only during the transition window → conditional will-change
  useEffect(() => {
    const el = headerRef.current
    if (!el || headerHidden === prevHidden.current) return
    prevHidden.current = headerHidden

    el.classList.add('app-header--animating')
    const id = setTimeout(() => el.classList.remove('app-header--animating'), 240)
    return () => clearTimeout(id)
  }, [headerHidden])

  return (
    <>
      <header
        ref={headerRef}
        className={`app-header ${headerHidden ? 'app-header--hidden' : ''}`}
      >
        <button
          className={`header-btn ${settingsOpen ? 'header-btn--active' : ''}`}
          onClick={settingsOpen ? closeSettings : openSettings}
          aria-label="Einstellungen"
        >
          {settingsOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <span className="header-title">Health Hub</span>
        <div className="header-spacer" />
      </header>

      {settingsOpen && <SettingsDrawer onClose={closeSettings} />}
    </>
  )
}
