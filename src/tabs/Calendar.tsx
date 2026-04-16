import {
  useEffect, useState, useRef, useCallback, type TouchEvent
} from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useHealthStore }   from '../stores/health'
import { useBaselineStore } from '../stores/baseline'
import { Glass }            from '../components/ui/Glass'
import { ScrollPane }       from '../components/ui/ScrollPane'
import { BottomSheet }      from '../components/ui/BottomSheet'
import { FAB }              from '../components/ui/FAB'
import { EventForm }        from '../components/forms/EventForm'
import type { EventType, HealthEvent } from '../db'
import './Calendar.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAY_NAMES_LONG  = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const MONTH_NAMES     = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns Monday of the week containing `date` */
function weekStart(date: Date): Date {
  const d   = new Date(date)
  const day = d.getDay()                     // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day      // adjust to Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns array of 7 Dates for the week starting at Monday `ws` */
function weekDays(ws: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws)
    d.setDate(d.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

function isToday(d: Date): boolean { return isSameDay(d, new Date()) }

function formatHeaderDate(d: Date): string {
  return `${DAY_NAMES_LONG[((d.getDay() + 6) % 7)]}, ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// ─── Event display helpers ────────────────────────────────────────────────────

const EVENT_EMOJI: Record<string, string> = {
  resting_heart_rate: '❤️', heart_rate: '💓', hrv: '⚡',
  sleep: '😴', temperature: '🌡', steps: '👣',
  spo2: '💧', medication: '💊', weight: '⚖️', blood_pressure: '🩺',
}
const EVENT_LABEL: Record<string, string> = {
  resting_heart_rate: 'Ruhepuls', heart_rate: 'Herzfrequenz', hrv: 'HRV',
  sleep: 'Schlaf', temperature: 'Temperatur', steps: 'Schritte',
  spo2: 'SpO₂', medication: 'Medikament', weight: 'Gewicht', blood_pressure: 'Blutdruck',
}
const EVENT_COLOR: Record<string, string> = {
  resting_heart_rate: 'var(--c-red)',    heart_rate: 'var(--c-red)',
  hrv:                'var(--c-green)',  sleep:      'var(--c-blue)',
  temperature:        'var(--c-yellow)', steps:      'var(--c-accent)',
  spo2:               'var(--c-blue)',   medication: 'var(--c-accent)',
  weight:             'var(--c-green)',  blood_pressure: 'var(--c-red)',
}

function formatEventValue(ev: HealthEvent): string {
  if (ev.type === 'medication') return String(ev.value)
  const n = typeof ev.value === 'number' ? ev.value : parseFloat(ev.value as string)
  if (isNaN(n)) return String(ev.value)
  const u = ev.unit
  if (u === 'h')  { const h = Math.floor(n); const m = Math.round((n-h)*60); return m ? `${h}h ${m}m` : `${h}h` }
  if (u === '°C') return `${n.toFixed(1)}°`
  if (u === '')   return n >= 1000 ? `${(n/1000).toFixed(1).replace('.',',')}k` : `${Math.round(n)}`
  return `${Math.round(n)} ${u}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendarTab() {
  const { dateEvents, loadEventsForDate, deleteEvent } = useHealthStore()
  const { recalculate }                                = useBaselineStore()

  // ── State ──
  const today         = new Date()
  const [ws, setWs]   = useState(() => weekStart(today))    // week start (Monday)
  const [active, setActive] = useState(today)               // active day
  const days          = weekDays(ws)

  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [initType,    setInitType]    = useState<EventType>('resting_heart_rate')
  const [initTime,    setInitTime]    = useState<string | undefined>(undefined)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  // ── Swipe gesture ──
  const touchX    = useRef(0)
  const swipeLock = useRef(false)

  // ── Load events when active date changes ──
  useEffect(() => {
    loadEventsForDate(active)
  }, [active])

  // ── Week navigation ──
  function prevWeek() {
    const d = new Date(ws); d.setDate(d.getDate() - 7); setWs(d)
  }
  function nextWeek() {
    const d = new Date(ws); d.setDate(d.getDate() + 7); setWs(d)
    // Auto-select first day of new week if active is in old week
    const newDays = weekDays(new Date(ws.getTime() + 7*86_400_000))
    if (!newDays.some(d => isSameDay(d, active))) setActive(newDays[0])
  }
  function selectDay(d: Date) {
    setActive(d)
    // If tapped day is in a different week, shift the week
    if (!days.some(day => isSameDay(day, d))) setWs(weekStart(d))
  }
  function goToToday() {
    setWs(weekStart(today))
    setActive(today)
  }

  // ── Swipe handlers (week navigation) ──
  function onTouchStart(e: TouchEvent) {
    touchX.current  = e.touches[0].clientX
    swipeLock.current = false
  }
  function onTouchEnd(e: TouchEvent) {
    if (swipeLock.current) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) < 60) return
    swipeLock.current = true
    dx < 0 ? nextWeek() : prevWeek()
  }

  // ── Open sheet helpers ──
  function openFAB() {
    setInitType('resting_heart_rate')
    setInitTime(undefined)
    setSheetOpen(true)
  }
  function openSlot(type: EventType = 'resting_heart_rate', time?: string) {
    setInitType(type)
    setInitTime(time)
    setSheetOpen(true)
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    if (deletingId === id) {
      await deleteEvent(id)
      await recalculate()
      await loadEventsForDate(active)
      setDeletingId(null)
    } else {
      setDeletingId(id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  async function afterSave() {
    setSheetOpen(false)
    await loadEventsForDate(active)
    await recalculate()
  }

  // ── Week label ──
  const wLabel = (() => {
    const first = days[0], last = days[6]
    if (first.getMonth() === last.getMonth())
      return `${first.getDate()}. – ${last.getDate()}. ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
    return `${first.getDate()}. ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()}. ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
  })()

  const isCurrentWeek = isSameDay(ws, weekStart(today))

  // ── Sorted events ──
  const sorted = [...dateEvents].sort((a,b) => +new Date(a.timestamp) - +new Date(b.timestamp))

  return (
    <>
      {/* ── Week Strip (fixed, outside scroll) ── */}
      <div
        className="cal-week-strip"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Week header row */}
        <div className="cal-week-header">
          <button className="cal-nav-btn" onClick={prevWeek} aria-label="Vorherige Woche">
            <ChevronLeft size={18} />
          </button>
          <span className="cal-week-label">{wLabel}</span>
          {!isCurrentWeek
            ? <button className="cal-today-btn" onClick={goToToday}>Heute</button>
            : <button className="cal-nav-btn" onClick={nextWeek} aria-label="Nächste Woche">
                <ChevronRight size={18} />
              </button>
          }
        </div>

        {/* Day cells */}
        <div className="cal-day-row">
          {days.map((d, i) => {
            const isActive  = isSameDay(d, active)
            const isTodayD  = isToday(d)
            const isFuture  = d > today
            return (
              <button
                key={i}
                className={[
                  'cal-day-cell',
                  isActive  ? 'cal-day-cell--active'  : '',
                  isTodayD  ? 'cal-day-cell--today'   : '',
                  isFuture  ? 'cal-day-cell--future'  : '',
                ].join(' ')}
                onClick={() => selectDay(d)}
                aria-label={`${DAY_NAMES_LONG[i]}, ${d.getDate()}.`}
                aria-pressed={isActive}
              >
                <span className="cal-day-name">{DAY_NAMES_SHORT[i]}</span>
                <span className="cal-day-num">{d.getDate()}</span>
                {/* Dot indicator – will be populated per-day in a future optimisation */}
                <span className="cal-day-dot" />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Timeline ── */}
      <ScrollPane className="cal-timeline">

        {/* Day heading */}
        <div className="cal-day-heading">
          <span className="cal-day-heading__label">{formatHeaderDate(active)}</span>
          {isToday(active) && <span className="cal-day-heading__badge">Heute</span>}
        </div>

        {sorted.length === 0 ? (
          /* Empty state */
          <div className="cal-empty" onClick={() => openSlot()}>
            <div className="cal-empty__icon">📅</div>
            <p className="cal-empty__title">Keine Einträge</p>
            <p className="cal-empty__sub">Tippe + um etwas hinzuzufügen</p>
          </div>
        ) : (
          /* Event list */
          <div className="cal-events anim-stagger">
            {sorted.map((ev, idx) => {
              const color = EVENT_COLOR[ev.type] ?? 'var(--c-accent)'
              const isLast = idx === sorted.length - 1
              return (
                <div key={ev.id} className="cal-event-row">
                  {/* Time column */}
                  <span className="cal-event-time">{formatTime(new Date(ev.timestamp))}</span>

                  {/* Timeline spine */}
                  <div className="cal-event-spine">
                    <div className="cal-event-dot" style={{ background: color }} />
                    {!isLast && <div className="cal-event-line" style={{ background: `${color}30` }} />}
                  </div>

                  {/* Card */}
                  <Glass className="cal-event-card glass--sub">
                    <div className="cal-event-card__left">
                      <span className="cal-event-card__emoji">{EVENT_EMOJI[ev.type] ?? '📊'}</span>
                      <span className="cal-event-card__label">{EVENT_LABEL[ev.type] ?? ev.type}</span>
                    </div>
                    <span className="cal-event-card__value" style={{ color }}>
                      {formatEventValue(ev)}
                    </span>
                    <button
                      className={`cal-event-del ${deletingId === ev.id ? 'cal-event-del--confirm' : ''}`}
                      onClick={() => handleDelete(ev.id)}
                      aria-label="Löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Glass>
                </div>
              )
            })}

            {/* Add-more slot at the bottom of a non-empty day */}
            <div className="cal-add-slot" onClick={() => openSlot()}>
              <span className="cal-add-slot__icon">+</span>
              <span className="cal-add-slot__label">Eintrag hinzufügen</span>
            </div>
          </div>
        )}
      </ScrollPane>

      {/* FAB */}
      <FAB onClick={openFAB} label="Eintrag hinzufügen" />

      {/* Bottom Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Eintragen">
        <EventForm
          initialType={initialType(initType)}
          onSave={afterSave}
          onCancel={() => setSheetOpen(false)}
        />
      </BottomSheet>
    </>
  )
}

// ─── tiny helper so TS is happy with the form prop ───────────────────────────
function initialType(t: EventType): EventType { return t }
