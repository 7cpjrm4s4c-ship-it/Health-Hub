import { useEffect, useState, lazy, Suspense } from 'react'
import { db }             from '../db'
import { calculateScore } from '../stores/baseline'
import { Glass }          from '../components/ui/Glass'
import { ScrollPane }     from '../components/ui/ScrollPane'
import './Analysis.css'

// ── Lazy-load recharts so it never lands in the initial JS parse budget.
// Analysis is already lazy-loaded as a tab, but splitting charts further
// means the tab shell (period filter, baseline grid, correlations) renders
// immediately while charts hydrate separately.
const AnalysisCharts = lazy(() => import('./AnalysisCharts'))

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayPoint {
  day:    string
  score:  number
  hr?:    number
  hrv?:   number
  sleep?: number
}

interface Correlation {
  emoji:    string
  trigger:  string
  result:   string
  severity: 'good' | 'warn' | 'bad'
}

export type Period = '7d' | '30d' | '90d'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0,0,0,0); return r }
function endOfDay  (d: Date): Date { const r = new Date(d); r.setHours(23,59,59,999); return r }

function dateLabel(d: Date, p: Period): string {
  if (p === '7d')  return d.toLocaleDateString('de-DE', { weekday: 'short' })
  if (p === '30d') return `${d.getDate()}.${d.getMonth()+1}.`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function latestNum(events: { type: string; value: number | string }[], type: string): number | undefined {
  const m = events.filter(e => e.type === type)
  if (!m.length) return undefined
  const v = m[m.length-1].value
  const n = typeof v === 'number' ? v : parseFloat(v as string)
  return isNaN(n) ? undefined : n
}

export function avg(arr: number[]): number | undefined {
  if (!arr.length) return undefined
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function fmtSleep(h: number): string {
  const hh = Math.floor(h); const mm = Math.round((h-hh)*60)
  return mm ? `${hh}h ${mm}m` : `${hh}h`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalysisTab() {
  const [period,   setPeriod]   = useState<Period>('7d')
  const [points,   setPoints]   = useState<DayPoint[]>([])
  const [corrs,    setCorrs]    = useState<Correlation[]>([])
  const [baseline, setBaseline] = useState<{ label: string; value: string; good: boolean }[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load(period) }, [period])

  async function load(p: Period) {
    setLoading(true)
    const days = p === '7d' ? 7 : p === '30d' ? 30 : 90
    const pts: DayPoint[] = []

    for (let i = days-1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const events = await db.events
        .where('timestamp').between(startOfDay(d), endOfDay(d), true, true).toArray()

      const hr    = latestNum(events, 'resting_heart_rate')
      const hrv   = latestNum(events, 'hrv')
      const sleep = latestNum(events, 'sleep')
      const temp  = latestNum(events, 'temperature')
      const steps = latestNum(events, 'steps')

      pts.push({
        day:   dateLabel(d, p),
        score: calculateScore({ restingHR: hr, avgHRV: hrv, sleepHours: sleep, temperature: temp, steps }),
        hr, hrv, sleep,
      })
    }

    setPoints(pts)
    buildCorrelations(pts)
    buildBaseline(pts)
    setLoading(false)
  }

  function buildCorrelations(pts: DayPoint[]) {
    const result: Correlation[] = []

    const sleepLow = pts.filter(p => p.sleep !== undefined && p.sleep < 6)
    const sleepOk  = pts.filter(p => p.sleep !== undefined && p.sleep >= 7)
    if (sleepLow.length >= 2 && sleepOk.length >= 2) {
      const hrLow = avg(sleepLow.map(p=>p.hr).filter(Boolean) as number[])
      const hrOk  = avg(sleepOk .map(p=>p.hr).filter(Boolean) as number[])
      if (hrLow && hrOk && hrLow > hrOk + 3)
        result.push({ emoji:'😴', trigger:'Schlaf < 6h', result:`Ruhepuls +${Math.round(hrLow-hrOk)} bpm`, severity:'warn' })
    }

    const hrvVals = pts.map(p=>p.hrv).filter(Boolean) as number[]
    if (hrvVals.length >= 4) {
      const a = avg(hrvVals.slice(0, Math.floor(hrvVals.length/2)))
      const b = avg(hrvVals.slice(Math.floor(hrvVals.length/2)))
      if (a && b && Math.abs(b-a) >= 5)
        result.push({ emoji: b>a?'⚡':'📉', trigger:'HRV Trend', result:`${b>a?'+':''}${Math.round(b-a)} ms im Zeitraum`, severity: b>a?'good':'bad' })
    }

    const scores = pts.map(p=>p.score).filter(s=>s>0)
    if (scores.length >= 5) {
      const a = avg(scores.slice(0, Math.floor(scores.length/3)))
      const b = avg(scores.slice(-Math.floor(scores.length/3)))
      if (a && b && Math.abs(b-a) >= 5)
        result.push({ emoji: b>a?'📈':'📉', trigger:'Score Trend', result:`${b>a?'Verbesserung':'Verschlechterung'} ${Math.abs(Math.round(b-a))} Punkte`, severity: b>a?'good':'bad' })
    }

    if (!result.length)
      result.push({ emoji:'📊', trigger:'Noch wenig Daten', result:'Mehr Einträge für Korrelationen nötig', severity:'warn' })

    setCorrs(result)
  }

  function buildBaseline(pts: DayPoint[]) {
    const hrV    = pts.map(p=>p.hr).filter(Boolean)    as number[]
    const hrvV   = pts.map(p=>p.hrv).filter(Boolean)   as number[]
    const sleepV = pts.map(p=>p.sleep).filter(Boolean) as number[]
    const scores = pts.map(p=>p.score).filter(s=>s>0)
    setBaseline([
      { label:'Ø Ruhepuls', value: hrV.length    ? `${Math.round(avg(hrV)!)} bpm`    : '—', good: !!avg(hrV)    && avg(hrV)!    <= 65 },
      { label:'Ø HRV',      value: hrvV.length   ? `${Math.round(avg(hrvV)!)} ms`    : '—', good: !!avg(hrvV)   && avg(hrvV)!   >= 45 },
      { label:'Ø Schlaf',   value: sleepV.length ? fmtSleep(avg(sleepV)!)            : '—', good: !!avg(sleepV) && avg(sleepV)! >= 7  },
      { label:'Ø Score',    value: scores.length ? `${Math.round(avg(scores)!)}`     : '—', good: !!avg(scores) && avg(scores)! >= 70 },
    ])
  }

  const sevColor = (s: Correlation['severity']) =>
    s === 'good' ? 'var(--c-green)' : s === 'bad' ? 'var(--c-red)' : 'var(--c-yellow)'

  return (
    <ScrollPane className="analysis-page">

      {/* Period filter */}
      <div className="an-period-row" role="group" aria-label="Zeitraum wählen">
        {(['7d','30d','90d'] as Period[]).map(p => (
          <button
            key={p}
            className={`an-period-btn ${period===p ? 'an-period-btn--active' : ''}`}
            onClick={() => setPeriod(p)}
            aria-pressed={period===p}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Charts – lazy boundary: shell renders immediately, charts hydrate after */}
      <Suspense fallback={<div className="an-skeleton" />}>
        <AnalysisCharts points={points} loading={loading} />
      </Suspense>

      {/* Correlations */}
      <p className="section-label">Erkannte Korrelationen</p>
      <div className="an-corr-list anim-stagger">
        {corrs.map((c, i) => (
          <Glass key={i} className="an-corr-card">
            <span className="an-corr-emoji" aria-hidden="true">{c.emoji}</span>
            <div className="an-corr-text">
              <span className="an-corr-trigger">{c.trigger}</span>
              <span className="an-corr-result" style={{ color: sevColor(c.severity) }}>→ {c.result}</span>
            </div>
          </Glass>
        ))}
      </div>

      {/* Baseline */}
      <p className="section-label">Deine Baseline ({period})</p>
      <div className="an-baseline-grid anim-stagger">
        {baseline.map(b => (
          <Glass key={b.label} className="an-baseline-card">
            <span className="an-baseline-val" style={{ color: b.good ? 'var(--c-green)' : 'var(--c-yellow)' }}>{b.value}</span>
            <span className="an-baseline-label">{b.label}</span>
          </Glass>
        ))}
      </div>

    </ScrollPane>
  )
}
