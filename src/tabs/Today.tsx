import { useEffect, useState } from 'react'
import { AlertCircle, Moon, Heart, Zap, Thermometer, Activity, Droplets, Trash2 } from 'lucide-react'
import type { LucideIcon }       from 'lucide-react'
import { useHealthStore }         from '../stores/health'
import { useBaselineStore, scoreLabel } from '../stores/baseline'
import { useSettingsStore, type WidgetId } from '../stores/settings'
import { Glass }                  from '../components/ui/Glass'
import { ScrollPane }             from '../components/ui/ScrollPane'
import { BottomSheet }            from '../components/ui/BottomSheet'
import { EventForm }              from '../components/forms/EventForm'
import type { EventType, HealthEvent } from '../db'
import './Today.css'

// ─── Widget meta ─────────────────────────────────────────────────────────────

interface WidgetMeta {
  label:    string
  unit:     string
  Icon:     LucideIcon
  colorVar: string
}

const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  sleep:       { label: 'Schlaf',     unit: 'h',   Icon: Moon,        colorVar: 'var(--c-blue)'    },
  resting_hr:  { label: 'Ruhepuls',   unit: 'bpm', Icon: Heart,       colorVar: 'var(--c-red)'     },
  hrv:         { label: 'HRV',        unit: 'ms',  Icon: Zap,         colorVar: 'var(--c-green)'   },
  temperature: { label: 'Temperatur', unit: '°C',  Icon: Thermometer, colorVar: 'var(--c-yellow)'  },
  steps:       { label: 'Schritte',   unit: '',    Icon: Activity,    colorVar: 'var(--c-accent)'  },
  spo2:        { label: 'SpO₂',       unit: '%',   Icon: Droplets,    colorVar: 'var(--c-blue)'    },
}

const EVENT_TO_WIDGET: Record<string, WidgetId> = {
  sleep:              'sleep',
  resting_heart_rate: 'resting_hr',
  hrv:                'hrv',
  temperature:        'temperature',
  steps:              'steps',
  spo2:               'spo2',
}

interface QuickType { type: EventType; label: string; emoji: string }

const QUICK_TYPES: QuickType[] = [
  { type: 'resting_heart_rate', label: 'Puls',       emoji: '❤️' },
  { type: 'hrv',                label: 'HRV',        emoji: '⚡' },
  { type: 'sleep',              label: 'Schlaf',     emoji: '😴' },
  { type: 'temperature',        label: 'Temp',       emoji: '🌡' },
  { type: 'steps',              label: 'Schritte',   emoji: '👣' },
  { type: 'spo2',               label: 'SpO₂',       emoji: '💧' },
  { type: 'medication',         label: 'Medikament', emoji: '💊' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Today() {
  const { todayEvents, activeIllness, loadAll, deleteEvent } = useHealthStore()
  const { today: baseline, loadToday, recalculate }          = useBaselineStore()
  const { widgets }                                          = useSettingsStore()

  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [initialType, setInitialType] = useState<EventType>('resting_heart_rate')
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  useEffect(() => {
    loadAll()
    recalculate().then(() => loadToday())
  }, [])

  // Derive latest value per widget from today's events
  const latestValues: Partial<Record<WidgetId, number>> = {}
  for (const ev of todayEvents) {
    const wid = EVENT_TO_WIDGET[ev.type]
    if (wid) {
      const num = typeof ev.value === 'number' ? ev.value : parseFloat(ev.value as string)
      if (!isNaN(num)) latestValues[wid] = num
    }
  }

  const score          = baseline?.score ?? 0
  const lbl            = scoreLabel(score)
  const visibleWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)

  function openSheet(type: EventType) {
    setInitialType(type)
    setSheetOpen(true)
  }

  function afterSave() {
    setSheetOpen(false)
    loadAll()
    recalculate().then(() => loadToday())
  }

  async function handleDelete(id: string) {
    if (deletingId === id) {
      await deleteEvent(id)
      await recalculate()
      await loadToday()
      setDeletingId(null)
    } else {
      setDeletingId(id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  return (
    <>
      <ScrollPane className="today-page">

        {/* Score Hero */}
        <Glass className="today-score anim-fade-in">
          <p className="today-score__eyebrow">Health Score · Heute</p>
          <div className="today-score__number-row">
            <span className="today-score__value">{score || '—'}</span>
            <span className="today-score__denom">/100</span>
          </div>
          <p className="today-score__label" style={{ color: lbl.color }}>
            {lbl.emoji} {lbl.text}
          </p>
          <div className="today-score__bar-track">
            <div className="today-score__bar-fill" style={{ width: `${score}%` }} />
          </div>
        </Glass>

        {/* Illness Alert */}
        {activeIllness && (
          <div className="today-alert anim-fade-in">
            <AlertCircle size={16} />
            <span>{activeIllness.type} aktiv · Tag {illnessDays(activeIllness.startDate)}</span>
            <span className="today-alert__date">seit {formatDate(activeIllness.startDate)}</span>
          </div>
        )}

        {/* Widget Grid */}
        <p className="section-label">Übersicht</p>
        <div className="today-grid anim-stagger">
          {visibleWidgets.map(({ id }) => (
            <WidgetCard
              key={id}
              meta={WIDGET_META[id]}
              value={latestValues[id]}
              onClick={() => openSheet(WIDGET_TO_EVENT[id])}
            />
          ))}
        </div>

        {/* Quick Add */}
        <p className="section-label">Erfassen</p>
        <div className="today-quick-scroll">
          <div className="today-quick-row">
            {QUICK_TYPES.map((qt) => (
              <button
                key={qt.type}
                className="today-quick-btn press-scale"
                onClick={() => openSheet(qt.type)}
              >
                <span className="today-quick-emoji">{qt.emoji}</span>
                <span className="today-quick-label">{qt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <>
            <p className="section-label">Heute eingetragen</p>
            <div className="today-events anim-stagger">
              {[...todayEvents]
                .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
                .map((ev) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    confirmingDelete={deletingId === ev.id}
                    onDelete={() => handleDelete(ev.id)}
                  />
                ))}
            </div>
          </>
        )}

      </ScrollPane>

      {/* Bottom Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Eintragen">
        <EventForm
          initialType={initialType}
          onSave={afterSave}
          onCancel={() => setSheetOpen(false)}
        />
      </BottomSheet>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WidgetCard({ meta, value, onClick }: { meta: WidgetMeta; value?: number; onClick: () => void }) {
  const { Icon, label, unit, colorVar } = meta
  return (
    <Glass className="widget-card glass--interactive" onClick={onClick}>
      <div className="widget-card__header">
        <div className="widget-card__icon-wrap" style={{ '--icon-color': colorVar } as React.CSSProperties}>
          <Icon size={15} />
        </div>
        {value === undefined && <span className="widget-card__add">+</span>}
      </div>
      <p className="widget-card__value">
        {value !== undefined ? formatValue(value, unit) : '—'}
      </p>
      <p className="widget-card__label">{label}</p>
    </Glass>
  )
}

function EventRow({ event, confirmingDelete, onDelete }: {
  event:            HealthEvent
  confirmingDelete: boolean
  onDelete:         () => void
}) {
  return (
    <Glass className="event-row glass--sub">
      <span className="event-row__time">{formatTime(new Date(event.timestamp))}</span>
      <span className="event-row__emoji">{eventEmoji(event.type)}</span>
      <span className="event-row__label">{eventLabel(event.type)}</span>
      <span className="event-row__value">{formatEventValue(event)}</span>
      <button
        className={`event-row__del ${confirmingDelete ? 'event-row__del--confirm' : ''}`}
        onClick={onDelete}
        aria-label={confirmingDelete ? 'Bestätigen' : 'Löschen'}
        title={confirmingDelete ? 'Nochmal tippen zum Löschen' : 'Eintrag löschen'}
      >
        <Trash2 size={13} />
      </button>
    </Glass>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WIDGET_TO_EVENT: Record<WidgetId, EventType> = {
  sleep: 'sleep', resting_hr: 'resting_heart_rate',
  hrv: 'hrv', temperature: 'temperature', steps: 'steps', spo2: 'spo2',
}

function illnessDays(start: Date): number {
  return Math.max(1, Math.round((Date.now() - +new Date(start)) / 86_400_000))
}
function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
function formatValue(v: number, unit: string): string {
  if (unit === 'h') {
    const h = Math.floor(v); const m = Math.round((v - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  if (unit === '') return v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}k` : `${Math.round(v)}`
  if (unit === '°C') return `${v.toFixed(1)}°`
  return `${Math.round(v)}`
}
function formatEventValue(ev: HealthEvent): string {
  if (ev.type === 'medication') return String(ev.value)
  const n = typeof ev.value === 'number' ? ev.value : parseFloat(ev.value as string)
  return `${isNaN(n) ? ev.value : formatValue(n, ev.unit)} ${ev.unit}`.trim()
}
function eventEmoji(type: EventType): string {
  const m: Record<string, string> = {
    resting_heart_rate:'❤️', heart_rate:'💓', hrv:'⚡', sleep:'😴',
    temperature:'🌡', steps:'👣', spo2:'💧', medication:'💊', weight:'⚖️',
  }
  return m[type] ?? '📊'
}
function eventLabel(type: EventType): string {
  const m: Record<string, string> = {
    resting_heart_rate:'Ruhepuls', heart_rate:'Herzfrequenz', hrv:'HRV',
    sleep:'Schlaf', temperature:'Temperatur', steps:'Schritte',
    spo2:'SpO₂', medication:'Medikament', weight:'Gewicht',
  }
  return m[type] ?? type
}
