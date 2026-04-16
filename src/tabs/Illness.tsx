import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine
} from 'recharts'
import { Plus, X, CheckCircle } from 'lucide-react'
import { useHealthStore }   from '../stores/health'
import { useBaselineStore } from '../stores/baseline'
import { Glass }            from '../components/ui/Glass'
import { ScrollPane }       from '../components/ui/ScrollPane'
import { BottomSheet }      from '../components/ui/BottomSheet'
import { FAB }              from '../components/ui/FAB'
import './Illness.css'

// ─── Illness types ────────────────────────────────────────────────────────────

const ILLNESS_TYPES = [
  'Erkältung', 'Grippe', 'Influenza', 'Corona', 'Magen-Darm',
  'Bronchitis', 'Sinusitis', 'Mandelentzündung', 'Andere',
]

const SYMPTOM_PRESETS = [
  'Fieber', 'Husten', 'Schnupfen', 'Halsschmerzen', 'Kopfschmerzen',
  'Gliederschmerzen', 'Müdigkeit', 'Übelkeit', 'Erbrechen',
  'Schüttelfrost', 'Appetitlosigkeit', 'Atemnot', 'Ohrenschmerzen',
]

// Temperature status
function tempStatus(t: number): { label: string; color: string } {
  if (t >= 39.0) return { label: 'Hohes Fieber', color: 'var(--c-red)'    }
  if (t >= 38.5) return { label: 'Fieber',       color: 'var(--c-red)'    }
  if (t >= 37.5) return { label: 'Erhöht',       color: 'var(--c-yellow)' }
  return              { label: 'Normal',       color: 'var(--c-green)'  }
}

function illnessDays(start: Date): number {
  return Math.max(1, Math.round((Date.now() - +new Date(start)) / 86_400_000))
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function fmtTemp(v: number): string {
  return `${v.toFixed(1)}°`
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0].value as number
  const st  = tempStatus(val)
  return (
    <div className="ill-chart-tooltip">
      <span className="ill-chart-tooltip__date">{label}</span>
      <span className="ill-chart-tooltip__val" style={{ color: st.color }}>
        {fmtTemp(val)}
      </span>
    </div>
  )
}

// ─── New illness form ─────────────────────────────────────────────────────────

function NewIllnessForm({ onSave, onCancel }: { onSave: (type: string) => void; onCancel: () => void }) {
  const [type, setType] = useState(ILLNESS_TYPES[0])

  return (
    <div className="ill-new-form">
      <p className="ill-new-form__label">Art der Erkrankung</p>
      <div className="ill-new-form__types">
        {ILLNESS_TYPES.map(t => (
          <button
            key={t}
            className={`ill-type-btn ${type === t ? 'ill-type-btn--active' : ''}`}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="ill-new-form__actions">
        <button className="ill-action-btn ill-action-btn--cancel" onClick={onCancel}>
          Abbrechen
        </button>
        <button className="ill-action-btn ill-action-btn--save" onClick={() => onSave(type)}>
          Erkrankung starten
        </button>
      </div>
    </div>
  )
}

// ─── Fever entry form ─────────────────────────────────────────────────────────

function FeverForm({ onSave, onCancel }: { onSave: (temp: number, time: string) => void; onCancel: () => void }) {
  const [val,  setVal]  = useState('')
  const [time, setTime] = useState(nowTime())
  const [err,  setErr]  = useState('')

  const PRESETS = [36.5, 37.0, 37.5, 38.0, 38.5, 39.0, 39.5, 40.0]

  function handle() {
    const n = parseFloat(val.replace(',', '.'))
    if (isNaN(n) || n < 34 || n > 43) { setErr('Ungültiger Wert (34–43 °C)'); return }
    onSave(n, time)
  }

  return (
    <div className="ill-fever-form">
      <div className="ill-fever-form__presets">
        {PRESETS.map(p => (
          <button
            key={p}
            className={`ill-preset-btn ${val === String(p) ? 'ill-preset-btn--active' : ''}`}
            onClick={() => { setVal(String(p)); setErr('') }}
          >
            {p}°
          </button>
        ))}
      </div>

      <div className="ill-fever-form__fields">
        <div className="ill-field">
          <label className="ill-label">Temperatur (°C)</label>
          <input
            className="ill-input"
            type="number"
            inputMode="decimal"
            value={val}
            onChange={e => { setVal(e.target.value); setErr('') }}
            placeholder="z.B. 38.4"
            step={0.1} min={34} max={43}
          />
        </div>
        <div className="ill-field">
          <label className="ill-label">Uhrzeit</label>
          <input
            className="ill-input ill-input--time"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>
      </div>

      {err && <p className="ill-error">{err}</p>}

      <div className="ill-fever-form__actions">
        <button className="ill-action-btn ill-action-btn--cancel" onClick={onCancel}>Abbrechen</button>
        <button className="ill-action-btn ill-action-btn--save"   onClick={handle}>Speichern</button>
      </div>
    </div>
  )
}

function nowTime(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IllnessTab() {
  const {
    activeIllness, loadActiveIllness,
    startIllness, closeIllness,
    addSymptom, addEvent, loadMedications, medications,
  } = useHealthStore()
  const { recalculate } = useBaselineStore()

  const [sheet, setSheet]             = useState<'new' | 'fever' | null>(null)
  const [tempData, setTempData]       = useState<{ day: string; temp: number }[]>([])
  const [symInput, setSymInput]       = useState(false)
  const [closing, setClosing]         = useState(false)

  useEffect(() => {
    loadActiveIllness()
    loadMedications()
  }, [])

  // Build fever chart data from illness start until today
  useEffect(() => {
    if (!activeIllness) return
    buildFeverData()
  }, [activeIllness])

  async function buildFeverData() {
    if (!activeIllness) return
    const start = new Date(activeIllness.startDate)
    const rows: { day: string; temp: number }[] = []

    for (let i = 0; i <= illnessDays(start); i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)

      // Query temp events for this day
      const dayEvents = await import('../db').then(({ db }) =>
        db.events
          .where('timestamp')
          .between(startOfDay(d), endOfDay(d), true, true)
          .and(e => e.type === 'temperature')
          .toArray()
      )
      if (dayEvents.length > 0) {
        const latest = dayEvents.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]
        rows.push({
          day:  `${d.getDate()}.${d.getMonth()+1}.`,
          temp: typeof latest.value === 'number' ? latest.value : parseFloat(latest.value as string),
        })
      }
    }
    setTempData(rows)
  }

  async function handleStartIllness(type: string) {
    await startIllness(type)
    setSheet(null)
    await loadActiveIllness()
  }

  async function handleFeverSave(temp: number, time: string) {
    const [h, m] = time.split(':').map(Number)
    const ts = new Date(); ts.setHours(h, m, 0, 0)
    await addEvent('temperature', temp, '°C', ts)
    await recalculate()
    setSheet(null)
    await buildFeverData()
  }

  async function handleAddSymptom(sym: string) {
    if (!activeIllness) return
    await addSymptom(activeIllness.id, sym)
    setSymInput(false)
  }

  async function handleClose() {
    if (!activeIllness) return
    setClosing(false)
    await closeIllness(activeIllness.id)
    await recalculate()
    await loadActiveIllness()
  }

  const latestTemp = tempData.length > 0 ? tempData[tempData.length - 1].temp : null
  const tempSt     = latestTemp !== null ? tempStatus(latestTemp) : null
  const days       = activeIllness ? illnessDays(activeIllness.startDate) : 0

  // ── No active illness ──────────────────────────────────────────────────────
  if (!activeIllness) {
    return (
      <>
        <ScrollPane className="illness-page">
          <div className="ill-empty">
            <div className="ill-empty__icon">💪</div>
            <p className="ill-empty__title">Kein aktiver Krankheitseintrag</p>
            <p className="ill-empty__sub">Tippe +, um eine Erkrankung zu erfassen</p>
          </div>
        </ScrollPane>

        <FAB onClick={() => setSheet('new')} label="Erkrankung starten" />

        <BottomSheet open={sheet === 'new'} onClose={() => setSheet(null)} title="Neue Erkrankung">
          <NewIllnessForm onSave={handleStartIllness} onCancel={() => setSheet(null)} />
        </BottomSheet>
      </>
    )
  }

  // ── Active illness ─────────────────────────────────────────────────────────
  return (
    <>
      <ScrollPane className="illness-page">

        {/* ── Header card ── */}
        <Glass className="ill-card anim-fade-in">
          <div className="ill-card__top">
            <div>
              <p className="ill-card__eyebrow">Aktuelle Erkrankung</p>
              <h2 className="ill-card__type">{activeIllness.type}</h2>
              <p className="ill-card__since">seit {fmtDate(activeIllness.startDate)}</p>
            </div>
            <div className="ill-day-badge">
              <span className="ill-day-badge__num">{days}</span>
              <span className="ill-day-badge__label">TAG{days !== 1 ? 'E' : ''}</span>
            </div>
          </div>

          {/* Latest temp pill */}
          {latestTemp !== null && tempSt && (
            <div className="ill-temp-pill" style={{ background: `${tempSt.color}18`, borderColor: `${tempSt.color}33` }}>
              <span className="ill-temp-pill__val" style={{ color: tempSt.color }}>{fmtTemp(latestTemp)}</span>
              <span className="ill-temp-pill__label" style={{ color: tempSt.color }}>{tempSt.label}</span>
            </div>
          )}

          {/* ── Fever chart ── */}
          {tempData.length > 0 ? (
            <div className="ill-chart-wrap">
              <p className="ill-chart-title">Fieberverlauf</p>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={tempData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--c-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--c-accent)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  {/* Reference line at fever threshold */}
                  <ReferenceLine y={38.5} stroke="rgba(255,69,58,0.4)" strokeDasharray="3 3" />
                  <Area
                    type="monotone" dataKey="temp"
                    stroke="var(--c-accent)" strokeWidth={2}
                    fill="url(#tempGrad)"
                    dot={{ fill: 'var(--c-accent)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--c-accent)', stroke: '#fff', strokeWidth: 1.5 }}
                  />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[36, 41]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <button className="ill-no-data-hint" onClick={() => setSheet('fever')}>
              Noch keine Temperatur eingetragen → jetzt erfassen
            </button>
          )}
        </Glass>

        {/* ── Symptoms ── */}
        <Glass className="ill-card">
          <div className="ill-section-header">
            <p className="ill-section-title">Symptome</p>
            <button
              className="ill-add-btn"
              onClick={() => setSymInput(!symInput)}
              aria-label="Symptom hinzufügen"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="ill-symptom-row">
            {activeIllness.symptoms.length === 0 && (
              <span className="ill-empty-hint">Noch keine Symptome</span>
            )}
            {activeIllness.symptoms.map(s => (
              <span key={s} className="ill-symptom-tag tag tag--accent">{s}</span>
            ))}
          </div>

          {/* Symptom picker */}
          {symInput && (
            <div className="ill-symptom-picker anim-fade-in">
              {SYMPTOM_PRESETS
                .filter(s => !activeIllness.symptoms.includes(s))
                .map(s => (
                  <button key={s} className="ill-symptom-opt" onClick={() => handleAddSymptom(s)}>
                    {s}
                  </button>
                ))}
            </div>
          )}
        </Glass>

        {/* ── Medications ── */}
        <Glass className="ill-card">
          <p className="ill-section-title">Medikamente</p>
          {medications.length === 0 ? (
            <p className="ill-empty-hint">Keine Medikamente im Katalog</p>
          ) : (
            <div className="ill-med-list">
              {medications.map(m => (
                <div key={m.id} className="ill-med-row">
                  <span className="ill-med-emoji">💊</span>
                  <div className="ill-med-info">
                    <span className="ill-med-name">{m.name}</span>
                    <span className="ill-med-dose">{m.dosage} {m.unit}</span>
                  </div>
                  {m.schedule && (
                    <span className="ill-med-schedule">{m.schedule.join(' · ')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Glass>

        {/* ── Close illness ── */}
        {!closing ? (
          <button className="ill-close-btn" onClick={() => setClosing(true)}>
            <CheckCircle size={16} />
            Erkrankung abschließen
          </button>
        ) : (
          <Glass className="ill-confirm-close">
            <p className="ill-confirm-close__text">Erkrankung wirklich als abgeschlossen markieren?</p>
            <div className="ill-confirm-close__actions">
              <button className="ill-action-btn ill-action-btn--cancel" onClick={() => setClosing(false)}>
                Abbrechen
              </button>
              <button className="ill-action-btn ill-action-btn--save" onClick={handleClose}>
                Ja, abschließen
              </button>
            </div>
          </Glass>
        )}

      </ScrollPane>

      {/* FAB → fever entry */}
      <FAB onClick={() => setSheet('fever')} label="Fieberwert eintragen" />

      {/* Fever sheet */}
      <BottomSheet open={sheet === 'fever'} onClose={() => setSheet(null)} title="Temperatur erfassen">
        <FeverForm onSave={handleFeverSave} onCancel={() => setSheet(null)} />
      </BottomSheet>
    </>
  )
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0,  0,  0,   0); return r }
function endOfDay(d:   Date): Date { const r = new Date(d); r.setHours(23, 59, 59, 999); return r }
