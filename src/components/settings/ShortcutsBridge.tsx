import { useState, useEffect } from 'react'
import { getBridgeToken, setBridgeToken, buildShortcutURL } from '../../services/shortcuts'
import { Glass } from '../ui/Glass'
import './ShortcutsBridge.css'

interface Props { onClose?: () => void }

export function ShortcutsBridge({ onClose }: Props) {
  const [token,    setToken]    = useState('')
  const [input,    setInput]    = useState('')
  const [copied,   setCopied]   = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [testDone, setTestDone] = useState(false)

  useEffect(() => {
    const t = getBridgeToken()
    if (t) { setToken(t); setInput(t) }
    else {
      // Generate a simple default token on first visit
      const def = 'healthhub' + Math.random().toString(36).slice(2, 6)
      setBridgeToken(def)
      setToken(def)
      setInput(def)
    }
  }, [])

  const appBase = window.location.origin + window.location.pathname
  const syncURL = token ? buildShortcutURL(appBase, token) : ''

  async function handleCopy() {
    if (!syncURL) return
    await navigator.clipboard.writeText(syncURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleSave() {
    if (!input.trim()) return
    setBridgeToken(input.trim())
    setToken(input.trim())
    setEditing(false)
  }

  function handleTest() {
    if (!syncURL) return
    const url = syncURL
      .replace('DATE', new Date().toISOString().slice(0, 10))
      .replace('RHR', '').replace('HRV', '').replace('SLEEP', '')
      .replace('STEPS', '').replace('SPO2', '99').replace('TEMP', '')
    window.location.href = url
    setTestDone(true)
  }

  const steps = [
    'Kurzbefehle-App oeffnen → + → Neue Automatisierung → Tageszeit (z.B. 06:00, 13:00, 20:00)',
    'Health-Messungen suchen hinzufuegen fuer: Ruheherzfrequenz, HRV, Schritte, Schlafdauer, Blutsauerstoff, Koerpertemperatur. Beschraenken AN, 1 Messung, Sortieren: Startdatum neueste zuerst.',
    'Datum-Aktion hinzufuegen. Format benutzerdefiniert: yyyy-MM-dd, Uhrzeit: Keine.',
    'URL oeffnen hinzufuegen. Sync-URL unten kopieren und einfuegen. Platzhalter DATE, RHR usw. durch Variablen der jeweiligen Aktion ersetzen.',
    'Ohne Bestaetigung ausfuehren aktivieren. Den Shortcut einmal manuell testen.',
  ]

  return (
    <div className="sb-page">

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
        {token && (
          <div className="sb-status-badge">
            <div className="sb-status-dot" />
            Aktiv
          </div>
        )}
      </div>

      {/* How it works */}
      <Glass className="sb-info-card">
        <div className="sb-section-label">Wie es funktioniert</div>
        <p className="sb-info-body">
          Ein iOS Kurzbefehl liest deine Apple Health-Daten und sendet sie automatisch an diese App.
          Kein Server – alles bleibt auf deinen Geräten.
          Auf mehreren Geräten denselben Token verwenden.
        </p>
      </Glass>

      {/* Token */}
      <Glass className="sb-token-card">
        <div className="sb-section-label">Dein Token</div>
        <p className="sb-token-hint">
          Gleichen Token auf allen Geräten eintragen → ein Shortcut reicht.
        </p>

        {editing ? (
          <div className="sb-token-input-row">
            <input
              className="sb-token-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Eigenes Passwort"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button className="sb-save-btn" onClick={handleSave} disabled={!input.trim()}>
              OK
            </button>
          </div>
        ) : (
          <div className="sb-token-saved-row">
            <code className="sb-token-value">{token}</code>
            <button className="sb-edit-btn" onClick={() => setEditing(true)}>Ändern</button>
          </div>
        )}
      </Glass>

      {/* Sync URL */}
      {syncURL && (
        <Glass className="sb-url-card">
          <div className="sb-section-label">Sync-URL für Shortcut</div>
          <div className="sb-url-text">{syncURL}</div>
          <div className="sb-url-actions">
            <button className="sb-copy-btn" onClick={handleCopy}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {copied
                  ? <polyline points="20 6 9 17 4 12" />
                  : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>
                }
              </svg>
              {copied ? 'Kopiert!' : 'URL kopieren'}
            </button>
            <button className="sb-test-btn" onClick={handleTest}>
              Sync testen
            </button>
          </div>
          {testDone && (
            <p className="sb-test-hint">
              App wurde neu geladen. Prüfe ob oben ein Toast erscheint.
            </p>
          )}
        </Glass>
      )}

      {/* Steps */}
      <div className="sb-section-label">Einrichtung Schritt für Schritt</div>
      <div className="sb-steps">
        {steps.map((s, i) => (
          <div key={i} className="sb-step-row">
            <div className="sb-step-num">{i + 1}</div>
            <div className="sb-step-text">{s}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
