import type { CSSProperties, ReactNode, MouseEvent } from 'react'
import './Glass.css'

interface GlassProps {
  children:  ReactNode
  className?: string
  style?:    CSSProperties
  variant?:  'default' | 'hi' | 'sub' | 'dark'
  interactive?: boolean
  onClick?:  (e: MouseEvent) => void
}

export function Glass({
  children,
  className = '',
  style,
  variant = 'default',
  interactive = false,
  onClick,
}: GlassProps) {
  const classes = [
    'glass',
    variant !== 'default' ? `glass--${variant}` : '',
    interactive           ? 'glass--interactive' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} style={style} onClick={onClick}>
      {children}
    </div>
  )
}
