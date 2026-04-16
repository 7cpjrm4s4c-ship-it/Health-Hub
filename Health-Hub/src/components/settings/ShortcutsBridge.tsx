import { useState, useEffect } from 'react'
import { Copy, Check, RefreshCw, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react'
import {
  getBridgeToken, generateBridgeToken, clearBridgeToken, buildShortcutURL
} from '../../services/shortcuts'
import { Glass } from '../ui/Glass'
import './ShortcutsBridge.css'

// ─── Setup steps ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '1',
    title: 'Shortcut öffnen',
    body: 'Öffne die Kurzbefehle-App auf deinem iPhone und tippe auf das + Symbol oben rechts.',
  },
  {
    num: '2',
    title: '"Gesundheitsmuster suchen" hinzufügen',
    body: 'Füge für jeden Wert eine eigene Aktion "Gesundheitsmuster suchen" hinzu. Wähle als Zeitraum "Heute".',
    details: [
      { label: 'Ruhepuls',          param: 'rhr',   note: 'Resting Heart Rate' },
      { label: 'Herzfrequenz-Var.',  param: 'hrv',   note: 'Heart Rate Variability' },
      { label: 'Schritte',           param: 'steps', note: 'Steps' },
      { label: 'Schlaf',             param: 'sleep', note: 'Sleep Analysis – Dauer in Stunden' },
      { label: 'Sauerstoffsätt.',    param: 'spo2',  note: 'Oxygen Saturation' },
      { label: 'Körpertemperatur',   param: 'temp',  note: 'Body Temperature' },
    ],
  },
  {
    num: '3',
    title: '"URL öffnen" hinzufügen',
    body: 'Füge die Aktion "URL öffnen" hinzu und ersetze die Werte mit den Ergebnissen der obigen Aktionen. Kopiere deine persönliche Sync-URL unten.',
  },
  {
    num: '4',
    title: 'Automatisierung einrichten',
    body: 'Gehe zu Automatisierungen → + → Persönliche Automatisierung → Tageszeit (z. B. 08:00 Uhr). Wähle deinen Shortcut aus. Aktiviere "Ohne Bestätigung ausführen".',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose?: () => void
}

export function ShortcutsBridge({ onClose }: Props) {
  const [token,       setToken]       = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)
  const [showRegen,   setShowRegen]   = useState(false)
  const [expandStep,  setExpandStep]  = useState<number | null>(null)

  useEffect(() => {
    // Load or generate token on first visit
    let t = getBridgeToken()
    if (!t) t = generateBridgeToken()
    setToken(t)
  }, [])

  // Build the template URL for display
  const appBase = window.location.origin + window.location.pathname.replace(/\/$/, '')
  const syncURL  = token ? buildShortcutURL(appBase, token) : ''

  // ── Copy URL ──
  async function copyURL() {
    if (!syncURL) return
    await navigator.clipboard.writeText(syncURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Regenerate token ──
  function regenToken() {
    const t = generateBridgeToken()
    setToken(t)
    setShowRegen(false)
  }

  return (
    <div className="sb-page">
      {/* Header */}
      <div className="sb-header">
        <div className="sb-header__icon">🔗</div>
        <div>
          <h2 className="sb-header__title">Shortcuts Bridge</h2>
          <p className="sb-header__sub">Apple Health → Health Hub</p>
        </div>
        {token && (
          <div className="sb-status sb-status--active">
            <span className="sb-status__dot" />
            Aktiv
          </div>
        )}
      </div>

      {/* How it works */}
      <Glass className="sb-info-card">
        <p className="sb-info-title">Wie es funktioniert</p>
        <p className="sb-info-body">
          Ein iOS Kurzbefehl liest täglich deine Apple Health-Daten und öffnet die App
          mit den Werten in der URL. Die Daten werden direkt in die App importiert —
          kein Server, alles bleibt auf deinem Gerät.
        </p>
      </Glass>

      {/* Sync URL */}
      <div className="sb-url-section">
        <p className="sb-section-label">Deine Sync-URL</p>
        <Glass className="sb-url-card">
          <p className="sb-url-text">{syncURL}</p>
          <div className="sb-url-actions">
            <button className="sb-copy-btn" onClick={copyURL}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Kopiert!' : 'URL kopieren'}
            </button>
            <button
              className="sb-regen-btn"
              onClick={() => setShowRegen(!showRegen)}
              title="Token neu generieren"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </Glass>
        {showRegen && (
          <Glass className="sb-regen-confirm anim-fade-in">
            <p className="sb-regen-confirm__text">
              Neuen Token generieren? Die alte URL funktioniert dann nicht mehr.
            </p>
            <div className="sb-regen-confirm__btns">
              <button className="sb-regen-cancel" onClick={() => setShowRegen(false)}>
                Abbrechen
              </button>
              <button className="sb-regen-ok" onClick={regenToken}>
                Neu generieren
              </button>
            </div>
          </Glass>
        )}
      </div>

      {/* Setup steps */}
      <p className="sb-section-label">Einrichtung (Schritt für Schritt)</p>
      <div className="sb-steps">
        {STEPS.map((step, i) => {
          const isOpen = expandStep === i
          return (
            <Glass key={i} className="sb-step">
              <button
                className="sb-step__header"
                onClick={() => setExpandStep(isOpen ? null : i)}
              >
                <div className="sb-step__num">{step.num}</div>
                <span className="sb-step__title">{step.title}</span>
                {isOpen
                  ? <ChevronDown size={16} className="sb-step__chevron" />
                  : <ChevronRight size={16} className="sb-step__chevron" />
                }
              </button>

              {isOpen && (
                <div className="sb-step__body anim-fade-in">
                  <p className="sb-step__text">{step.body}</p>
                  {step.details && (
                    <div className="sb-step__details">
                      {step.details.map(d => (
                        <div key={d.param} className="sb-step__detail-row">
                          <code className="sb-step__param">{d.param}=</code>
                          <div>
                            <span className="sb-step__detail-label">{d.label}</span>
                            <span className="sb-step__detail-note">{d.note}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {i === 2 && (
                    <button className="sb-copy-inline" onClick={copyURL}>
                      {copied ? '✓ Kopiert' : 'Sync-URL kopieren'}
                    </button>
                  )}
                </div>
              )}
            </Glass>
          )
        })}
      </div>

      {/* URL template explanation */}
      <Glass className="sb-template-card">
        <p className="sb-info-title">URL-Parameter Übersicht</p>
        <div className="sb-params">
          {[
            { p: 'hh_sync', desc: 'Dein persönlicher Token (automatisch)' },
            { p: 'date',    desc: 'Datum im Format YYYY-MM-DD' },
            { p: 'rhr',     desc: 'Ruhepuls in bpm' },
            { p: 'hrv',     desc: 'HRV in ms' },
            { p: 'sleep',   desc: 'Schlafdauer in Stunden (z.B. 7.5)' },
            { p: 'steps',   desc: 'Schritte als ganze Zahl' },
            { p: 'spo2',    desc: 'Sauerstoffsättigung in %' },
            { p: 'temp',    desc: 'Körpertemperatur in °C' },
          ].map(r => (
            <div key={r.p} className="sb-param-row">
              <code className="sb-param-key">{r.p}</code>
              <span className="sb-param-desc">{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="sb-param-note">
          Alle Parameter außer <code>hh_sync</code> und <code>date</code> sind optional.
          Fehlende Werte werden einfach übersprungen.
        </p>
      </Glass>

    </div>
  )
}
