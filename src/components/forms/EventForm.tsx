import { useState, useEffect } from 'react'
import { useHealthStore }   from '../../stores/health'
import { useBaselineStore } from '../../stores/baseline'
import type { EventType }   from '../../db'
import './EventForm.css'

// ─── Type definitions ─────────────────────────────────────────────────────────

interface TypeConfig {
  type:        EventType
  label:       string
  emoji:       string
  unit:        string
  inputMode:   'decimal' | 'numeric'
  min:         number
  max:         number
  step:        number
  placeholder: string
}

const TYPE_CONFIGS: TypeConfig[] = [
  { type: 'resting_heart_rate', label: 'Ruhepuls',    emoji: '❤️', unit: 'bpm', inputMode: 'numeric',  min: 30,   max: 200,  step: 1,   placeholder: 'z.B. 58'   },
  { type: 'hrv',                label: 'HRV',          emoji: '⚡', unit: 'ms',  inputMode: 'numeric',  min: 10,   max: 200,  step: 1,   placeholder: 'z.B. 48'   },
  { type: 'sleep',              label: 'Schlaf',       emoji: '😴', unit: 'h',   inputMode: 'decimal',  min: 0,    max: 24,   step: 0.25,placeholder: 'z.B. 7.5'  },
  { type: 'temperature',        label: 'Temperatur',   emoji: '🌡', unit: '°C',  inputMode: 'decimal',  min: 34,   max: 43,   step: 0.1, placeholder: 'z.B. 37.2' },
  { type: 'steps',              label: 'Schritte',     emoji: '👣', unit: '',    inputMode: 'numeric',  min: 0,    max: 99999,step: 100, placeholder: 'z.B. 8000' },
  { type: 'spo2',               label: 'SpO₂',         emoji: '💧', unit: '%',   inputMode: 'numeric',  min: 80,   max: 100,  step: 1,   placeholder: 'z.B. 98'   },
  { type: 'medication',         label: 'Medikament',   emoji: '💊', unit: '',    inputMode: 'decimal',  min: 0,    max: 9999, step: 1,   placeholder: 'Dosierung' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialType?: EventType
  initialTime?: string          // 'HH:MM' – pre-fills the time field
  onSave:       () => void
  onCancel:     () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventForm({ initialType = 'resting_heart_rate', initialTime, onSave, onCancel }: Props) {
  const { addEvent, medications, loadMedications } = useHealthStore()
  const { recalculate, loadToday }                 = useBaselineStore()

  const [selectedType, setSelectedType] = useState<EventType>(initialType)
  const [value,        setValue]        = useState('')
  const [time,         setTime]         = useState(initialTime ?? currentTime())
  const [medName,      setMedName]      = useState('')
  const [error,        setError]        = useState('')
  const [saving,       setSaving]       = useState(false)

  const cfg = TYPE_CONFIGS.find((c) => c.type === selectedType)!

  // Load medication catalog for the medication type
  useEffect(() => { loadMedications() }, [])

  // Reset value when type changes
  useEffect(() => {
    setValue('')
    setMedName('')
    setError('')
  }, [selectedType])

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (selectedType === 'medication') {
      if (!medName.trim()) return 'Bitte Medikament angeben'
      return null
    }
    if (!value.trim()) return 'Bitte einen Wert eingeben'
    const num = parseFloat(value.replace(',', '.'))
    if (isNaN(num))         return 'Ungültiger Wert'
    if (num < cfg.min)      return `Minimum: ${cfg.min} ${cfg.unit}`
    if (num > cfg.max)      return `Maximum: ${cfg.max} ${cfg.unit}`
    return null
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    try {
      const timestamp = timeToDate(time)

      if (selectedType === 'medication') {
        const dosageNum = value ? parseFloat(value.replace(',', '.')) : undefined
        await addEvent('medication', medName, '',  timestamp, {
          dosage: dosageNum,
          unit:   cfg.unit,
          name:   medName,
        })
      } else {
        const num = parseFloat(value.replace(',', '.'))
        await addEvent(selectedType, num, cfg.unit, timestamp)
      }

      // Recalculate score + reload baseline
      await recalculate()
      await loadToday()

      onSave()
    } catch (e) {
      setError('Fehler beim Speichern. Bitte nochmal versuchen.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="event-form">

      {/* Type selector */}
      <div className="ef-type-scroll">
        <div className="ef-type-row">
          {TYPE_CONFIGS.map((c) => (
            <button
              key={c.type}
              className={`ef-type-pill ${selectedType === c.type ? 'ef-type-pill--active' : ''}`}
              onClick={() => setSelectedType(c.type)}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form fields */}
      <div className="ef-fields">

        {/* Medication: name selector */}
        {selectedType === 'medication' && (
          <div className="ef-field">
            <label className="ef-label">Medikament</label>
            {medications.length > 0 ? (
              <select
                className="ef-select"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
              >
                <option value="">— wählen —</option>
                {medications.map((m) => (
                  <option key={m.id} value={`${m.name} ${m.dosage}${m.unit}`}>
                    {m.name} {m.dosage}{m.unit}
                  </option>
                ))}
                <option value="__custom__">Anderes …</option>
              </select>
            ) : (
              <input
                className="ef-input"
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder="Medikament eingeben"
              />
            )}
            {/* Custom name input when "Anderes" selected */}
            {medName === '__custom__' && (
              <input
                className="ef-input"
                style={{ marginTop: 'var(--sp-sm)' }}
                type="text"
                placeholder="Name eingeben"
                onChange={(e) => setMedName(e.target.value === '' ? '__custom__' : e.target.value)}
                autoFocus
              />
            )}
          </div>
        )}

        {/* Value input */}
        <div className="ef-field">
          <label className="ef-label">
            {selectedType === 'medication'
              ? 'Dosierung (optional)'
              : `Wert ${cfg.unit ? `(${cfg.unit})` : ''}`}
          </label>
          <div className="ef-input-wrap">
            <input
              className="ef-input"
              type="number"
              inputMode={cfg.inputMode}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError('') }}
              placeholder={cfg.placeholder}
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
            />
            {cfg.unit && selectedType !== 'medication' && (
              <span className="ef-unit">{cfg.unit}</span>
            )}
          </div>

          {/* Quick presets for sleep */}
          {selectedType === 'sleep' && (
            <div className="ef-presets">
              {[5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((h) => (
                <button
                  key={h}
                  className={`ef-preset ${value === String(h) ? 'ef-preset--active' : ''}`}
                  onClick={() => setValue(String(h))}
                >
                  {h}h
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for temperature */}
          {selectedType === 'temperature' && (
            <div className="ef-presets">
              {[36.5, 37.0, 37.5, 38.0, 38.5, 39.0, 39.5].map((t) => (
                <button
                  key={t}
                  className={`ef-preset ${value === String(t) ? 'ef-preset--active' : ''}`}
                  onClick={() => setValue(String(t))}
                >
                  {t}°
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time */}
        <div className="ef-field">
          <label className="ef-label">Uhrzeit</label>
          <input
            className="ef-input ef-input--time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && <p className="ef-error">{error}</p>}

      {/* Actions */}
      <div className="ef-actions">
        <button className="ef-btn ef-btn--cancel" onClick={onCancel} disabled={saving}>
          Abbrechen
        </button>
        <button className="ef-btn ef-btn--save" onClick={handleSave} disabled={saving}>
          {saving ? '…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function timeToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}
