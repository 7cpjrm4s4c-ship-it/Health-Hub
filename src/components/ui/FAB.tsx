import { Plus } from 'lucide-react'
import './FAB.css'

interface FABProps {
  onClick: () => void
  label?:  string
}

export function FAB({ onClick, label = 'Hinzufügen' }: FABProps) {
  return (
    <button
      className="fab press-scale"
      onClick={onClick}
      aria-label={label}
    >
      <Plus size={24} />
    </button>
  )
}
