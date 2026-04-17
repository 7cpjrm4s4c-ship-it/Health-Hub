import { useState, useEffect } from 'react'
import { getBridgeToken, setBridgeToken, buildShortcutURL } from '../../services/shortcuts'
import { Glass } from '../ui/Glass'
import './ShortcutsBridge.css'

interface Props { onClose?: () => void }

export function ShortcutsBridge({ onClose }: Props) {
  const [token,   setToken]   = useState('')
  const [saved,   setSaved]   = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const t = getBridgeToken()
    if (t) { setToken(t); setSaved(true) }
  }, [])

  const appBase = window.location.origin + window.location.pathname
  const syncURL = saved && token
    ? buildShortcutURL(appBase, token)
    : ''

  function handleSave() {
    if (!token.trim()) return
    setBridgeToken(token.trim())
    setSaved(true)
    setEditing(false)
  }

  async function handleCopy() {
    if (!syncURL) return
    await navigator.clipboard.writeText(syncURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    'Kurzbefehle-App oeffnen → + → Neue Automatisierung → Tageszeit (z.B. 06:00)',
    'Health-Messungen suchen hinzufuegen fuer: Ruheherzfrequenz, HRV, Schritte, Schlafdauer, Blutsauerstoff, Koerpertemperatur. Jeweils: Beschraenken AN, Abrufen 1 Messung, Sortieren nach Startdatum absteigend.',
    'Datum-Aktion hinzufuegen: Format yyyy-MM-dd, Uhrzeit: Keine.',
    'URL oeffnen hinzufuegen. Die Sync-URL unten kopieren und einfuegen. Platzhalter DATE, RHR, HRV usw. durch die jeweiligen Variablen ersetzen.',
    'Ohne Bestaetigung ausfuehren aktivieren. Fertig.',
  ]

  return (
    <div className="sb-page">

      {/* Header */}
      <div className="sb-header">
        <div className="sb-header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div>
          <div className="sb-header-title">Shortcuts Bridge</div>
          <div className="sb-header-sub">Apple Health → Health Hub</div>
        </div>
        {saved && (
          <div className="sb-status-badge">
            <div className="sb-status-dot" />
            Aktiv
          </div>
        )}
      </div>

      {/* Token setup */}
      <Glass className="sb-token-card">
        <div className="sb-section-label">Dein persönlicher Token</div>
        <p className="sb-token-hint">
          Wähle ein eigenes Passwort als Token. Verwende dasselbe auf allen deinen Geräten –
          dann brauchst du den Shortcut nur einmal einzurichten.
        </p>

        {(!saved || editing) ? (
          <div className="sb-token-input-row">
            <input
              className="sb-token-input"
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="z.B. meingeheimerwert123"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              className="sb-save-btn"
              onClick={handleSave}
              disabled={!token.trim()}
            >
              Speichern
            </button>
          </div>
        ) : (
          <div className="sb-token-saved-row">
            <div className="sb-token-value">
              {'•'.repeat(Math.min(token.length, 20))}
            </div>
            <button className="sb-edit-btn" onClick={() => setEditing(true)}>
              Ändern
            </button>
          </div>
        )}
      </Glass>

      {/* Sync URL – only shown when token is set */}
      {saved && syncURL && (
        <Glass className="sb-url-card">
          <div className="sb-section-label">Deine Sync-URL</div>
          <div className="sb-url-text">{syncURL}</div>
          <button className="sb-copy-btn" onClick={handleCopy}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {copied
                ? <polyline points="20 6 9 17 4 12" />
                : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>
              }
            </svg>
            {copied ? 'Kopiert!' : 'URL kopieren'}
          </button>
          <button className="sb-test-btn" onClick={() => {
            const testUrl = syncURL
              .replace('DATE', new Date().toISOString().slice(0,10))
              .replace('RHR','').replace('HRV','').replace('SLEEP','')
              .replace('STEPS','').replace('SPO2','99').replace('TEMP','')
            window.location.href = testUrl
          }}>
            Sync testen (SpO2=99)
          </button>
        </Glass>
      )}

      {/* Setup steps */}
      <div className="sb-section-label">Einrichtung</div>
      <div className="sb-steps">
        {steps.map((s, i) => (
          <div key={i} className="sb-step-row">
            <div className="sb-step-num">{i + 1}</div>
            <div className="sb-step-text">{s}</div>
          </div>
        ))}
      </div>

      {/* Multi-device note */}
      <Glass className="sb-info-card">
        <div className="sb-section-label">Mehrere Geräte</div>
        <p className="sb-info-body">
          Trage auf jedem Gerät denselben Token ein. Der Shortcut muss nur einmal
          auf einem iPhone eingerichtet werden und funktioniert dann für alle Geräte
          mit demselben Token.
        </p>
      </Glass>

    </div>
  )
}
