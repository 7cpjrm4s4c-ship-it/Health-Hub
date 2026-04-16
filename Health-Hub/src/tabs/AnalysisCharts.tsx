/**
 * AnalysisCharts – recharts isolated in its own chunk.
 * Imported via lazy() from Analysis.tsx so recharts is excluded from
 * the initial JS parse budget entirely.
 */
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { Glass } from '../components/ui/Glass'
import type { Period } from './Analysis'
import './Analysis.css'

interface DayPoint {
  day:    string
  score:  number
  hr?:    number
  hrv?:   number
  sleep?: number
}

interface Props {
  points:  DayPoint[]
  loading: boolean
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#181818', border: '1px solid var(--c-border)',
      borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: 'var(--c-text)',
    }}>
      <div style={{ color: 'var(--c-text-sec)', marginBottom: 2 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function AnalysisCharts({ points, loading }: Props) {
  if (loading) return <div className="an-skeleton" />

  return (
    <>
      {/* Score trend */}
      <Glass className="an-card">
        <p className="an-card__title">Health Score Verlauf</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--c-accent)" stopOpacity={0.40} />
                <stop offset="95%" stopColor="var(--c-accent)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="score" name="Score"
              stroke="var(--c-accent)" strokeWidth={2} fill="url(#scoreGrad)" dot={false}
              activeDot={{ r:4, fill:'var(--c-accent)', stroke:'#fff', strokeWidth:1.5 }}
            />
            <XAxis dataKey="day" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0,100]} tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </Glass>

      {/* HRV + HR dual chart (only when data available) */}
      {points.some(p => p.hrv !== undefined) && (
        <Glass className="an-card">
          <p className="an-card__title">HRV & Ruhepuls</p>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="hrv" stroke="var(--c-green)" strokeWidth={2} dot={false} name="HRV ms"  />
              <Line type="monotone" dataKey="hr"  stroke="var(--c-red)"   strokeWidth={2} dot={false} name="Puls bpm" />
            </LineChart>
          </ResponsiveContainer>
        </Glass>
      )}
    </>
  )
}
