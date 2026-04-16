import { useRef, type ReactNode, type CSSProperties } from 'react'
import { useUIStore } from '../../stores/ui'

interface Props {
  children:   ReactNode
  className?: string
  style?:     CSSProperties
}

/**
 * Scrollable container that drives header auto-hide.
 *
 * Optimisations:
 *  1. latestYRef  – captures every scroll position synchronously;
 *     the rAF callback always reads the MOST RECENT value,
 *     not just the first one in a batch.
 *     Fixes vague header-reveal delay on 120 Hz ProMotion / fast flicks.
 *  2. ticking     – rAF throttle: at most 1 frame per update.
 *  3. hiddenRef   – store write only when value actually changes.
 */
export function ScrollPane({ children, className = '', style }: Props) {
  const lastY     = useRef(0)
  const latestY   = useRef(0)   // ← always holds the newest scrollTop
  const hiddenRef = useRef(false)
  const ticking   = useRef(false)
  const setHidden = useUIStore((s) => s.setHeaderHidden)

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    // Capture synchronously on every event
    latestY.current = e.currentTarget.scrollTop

    if (ticking.current) return
    ticking.current = true

    requestAnimationFrame(() => {
      const y    = latestY.current   // use freshest value
      const next = y > lastY.current && y > 60

      if (next !== hiddenRef.current) {
        hiddenRef.current = next
        setHidden(next)
      }

      lastY.current   = y
      ticking.current = false
    })
  }

  return (
    <div
      className={`scroll-container ${className}`}
      style={style}
      onScroll={onScroll}
    >
      {children}
    </div>
  )
}
