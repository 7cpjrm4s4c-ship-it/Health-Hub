import { useEffect, useRef, type ReactNode } from 'react'
import './BottomSheet.css'

interface Props {
  open:     boolean
  onClose:  () => void
  title?:   string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  const panelRef   = useRef<HTMLDivElement>(null)
  const startYRef  = useRef(0)
  const currentYRef = useRef(0)
  const dragging   = useRef(false)

  // ── Drag to close ──────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current  = e.touches[0].clientY
    currentYRef.current = 0
    dragging.current   = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || !panelRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta < 0) return                           // don't drag upward
    currentYRef.current = delta
    panelRef.current.style.transform = `translateY(${delta}px)`
    panelRef.current.style.transition = 'none'
  }

  const onTouchEnd = () => {
    if (!panelRef.current) return
    dragging.current = false
    panelRef.current.style.transition = ''

    if (currentYRef.current > 120) {
      onClose()
    } else {
      panelRef.current.style.transform = 'translateY(0)'
    }
    currentYRef.current = 0
  }

  // ── Lock body scroll when open ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      // Reset panel transform when closing
      if (panelRef.current) {
        panelRef.current.style.transform  = ''
        panelRef.current.style.transition = ''
      }
    }
    return () => { document.documentElement.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="sheet-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Dialog'}
    >
      <div
        ref={panelRef}
        className="sheet-panel anim-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="sheet-handle-bar" />

        {/* Title row */}
        {title && (
          <div className="sheet-header">
            <h2 className="sheet-title">{title}</h2>
            <button className="sheet-close" onClick={onClose} aria-label="Schließen">✕</button>
          </div>
        )}

        {/* Content */}
        <div className="sheet-body">
          {children}
        </div>
      </div>
    </div>
  )
}
