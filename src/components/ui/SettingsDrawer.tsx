import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useUIStore }          from '../../stores/ui'
import { useSettingsStore }    from '../../stores/settings'
import { ShortcutsBridge }     from '../settings/ShortcutsBridge'
import { BottomSheet }         from './BottomSheet'
import type { Theme }          from '../../db'
import './SettingsDrawer.css'

interface Props { onClose: () => void }

export function SettingsDrawer({ onClose }: Props) {
  const { theme, setTheme }   = useUIStore()
  const { widgets, toggleWidget } = useSettingsStore()
  const [bridgeOpen, setBridgeOpen] = useState(false)

  const themes: { id: Theme; label: string; emoji: string }[] = [
    { id: 'dark',  label: 'Dark',  emoji: '🌑' },
    { id: 'light', label: 'Light', emoji: '☀️' },
    { id: 'auto',  label: 'Auto',  emoji: '⚙️' },
  ]

  return (
    <>
      <div className="settings-drawer anim-fade-in" onClick={e => e.stopPropagation()}>

        {/* Theme */}
        <section className="sd-section">
          <p className="sd-label">Erscheinungsbild</p>
          <div className="sd-theme-row">
            {themes.map(t => (
              <button
                key={t.id}
                className={`sd-theme-btn ${theme === t.id ? 'sd-theme-btn--active' : ''}`}
                onClick={() => setTheme(t.id)}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Widget visibility */}
        <section className="sd-section">
          <p className="sd-label">Widgets</p>
          <div className="sd-widget-list">
            {widgets.map(w => (
              <div key={w.id} className="sd-widget-row" onClick={() => toggleWidget(w.id)}>
                <span className="sd-widget-name">{WIDGET_LABELS[w.id]}</span>
                <div className={`sd-toggle ${w.visible ? 'sd-toggle--on' : ''}`} />
              </div>
            ))}
          </div>
        </section>

        {/* Menu items */}
        <section className="sd-section sd-section--last">
          {/* Shortcuts Bridge – opens full sheet */}
          <div
            className="sd-menu-row sd-menu-row--highlight"
            onClick={() => setBridgeOpen(true)}
          >
            <span className="sd-menu-emoji">🔗</span>
            <div className="sd-menu-text">
              <span className="sd-menu-title">Shortcuts Bridge</span>
              <span className="sd-menu-sub">Apple Health automatisch importieren</span>
            </div>
            <ChevronRight size={14} className="sd-menu-chevron" />
          </div>

          {[
            { emoji: '💊', label: 'Medikamentenkatalog', sub: 'Gespeicherte Medikamente' },
            { emoji: 'ℹ️', label: 'Über Health Hub',     sub: 'Version 1.6.0'            },
          ].map(item => (
            <div key={item.label} className="sd-menu-row" onClick={onClose}>
              <span className="sd-menu-emoji">{item.emoji}</span>
              <div className="sd-menu-text">
                <span className="sd-menu-title">{item.label}</span>
                <span className="sd-menu-sub">{item.sub}</span>
              </div>
              <ChevronRight size={14} className="sd-menu-chevron" />
            </div>
          ))}
        </section>
      </div>

      {/* Shortcuts Bridge full sheet */}
      <BottomSheet
        open={bridgeOpen}
        onClose={() => setBridgeOpen(false)}
        title="Shortcuts Bridge"
      >
        <ShortcutsBridge onClose={() => setBridgeOpen(false)} />
      </BottomSheet>
    </>
  )
}

const WIDGET_LABELS: Record<string, string> = {
  sleep: 'Schlaf', resting_hr: 'Ruhepuls', hrv: 'HRV',
  temperature: 'Temperatur', steps: 'Schritte', spo2: 'SpO₂',
}
