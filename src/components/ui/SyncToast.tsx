import { useEffect, useState } from 'react'
import type { SyncResult } from '../../services/shortcuts'
import './SyncToast.css'

interface Props {
  result: SyncResult
  onDone: () => void
}

export function SyncToast({ result, onDone }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 3500)
    return () => clearTimeout(t)
  }, [])

  const icon    = result.success ? '✅' : '⚠️'
  const heading = result.success
    ? `${result.imported} Werte importiert`
    : 'Sync fehlgeschlagen'
  const sub     = result.success
    ? `Apple Health → ${result.date}`
    : result.error ?? 'Unbekannter Fehler'

  return (
    // role="status" + aria-live="polite": VoiceOver announces the message
    // without interrupting the user's current focus
    <div
      className={`sync-toast ${visible ? 'sync-toast--in' : 'sync-toast--out'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sync-toast__icon" aria-hidden="true">{icon}</span>
      <div className="sync-toast__text">
        <span className="sync-toast__heading">{heading}</span>
        <span className="sync-toast__sub">{sub}</span>
      </div>
    </div>
  )
}
