import { useEffect, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { db, type Illness, type Medication } from '../db'
import { Glass }      from '../components/ui/Glass'
import { ScrollPane } from '../components/ui/ScrollPane'
import './History.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function durationDays(start: Date, end?: Date): number {
  const e = end ? new Date(end) : new Date()
  return Math.max(1, Math.round((+e - +new Date(start)) / 86_400_000))
}

const TYPE_EMOJI: Record<string, string> = {
  'Erkältung': '🤧', 'Grippe': '🤒', 'Influenza': '🤒',
  'Corona': '😷', 'Magen-Darm': '🤢', 'Bronchitis': '😮‍💨',
  'Sinusitis': '🤧', 'Mandelentzündung': '😣', 'Andere': '🏥',
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function IllnessDetail({
  illness,
  medications,
  onBack,
}: {
  illness:     Illness
  medications: Medication[]
  onBack:      () => void
}) {
  const days = durationDays(illness.startDate, illness.endDate)
  const meds = medications.filter(m => illness.medicationIds.includes(m.id))

  return (
    <ScrollPane className="history-page">
      <button className="hist-back-btn" onClick={onBack}>
        <ChevronLeft size={16} /> Zurück
      </button>

      <Glass className="hist-detail-card anim-fade-in">
        <div className="hist-detail-header">
          <span className="hist-detail-emoji">{TYPE_EMOJI[illness.type] ?? '🏥'}</span>
          <div>
            <h2 className="hist-detail-type">{illness.type}</h2>
            <p className="hist-detail-dates">
              {fmtDate(illness.startDate)}
              {illness.endDate && ` → ${fmtDate(illness.endDate)}`}
            </p>
          </div>
          <div className="hist-detail-badge">
            <span className="hist-detail-badge__num">{days}</span>
            <span className="hist-detail-badge__label">TAGE</span>
          </div>
        </div>

        {/* Status */}
        <div className={`hist-status-pill ${illness.endDate ? 'hist-status-pill--done' : 'hist-status-pill--active'}`}>
          {illness.endDate ? '✓ Abgeschlossen' : '⚡ Aktiv'}
        </div>

        {/* Symptoms */}
        {illness.symptoms.length > 0 && (
          <div className="hist-section">
            <p className="hist-section-label">Symptome</p>
            <div className="hist-symptom-row">
              {illness.symptoms.map(s => (
                <span key={s} className="tag tag--accent">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {meds.length > 0 && (
          <div className="hist-section">
            <p className="hist-section-label">Medikamente</p>
            <div className="hist-med-list">
              {meds.map(m => (
                <div key={m.id} className="hist-med-row">
                  <span>💊</span>
                  <span className="hist-med-name">{m.name} {m.dosage}{m.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {illness.notes && (
          <div className="hist-section">
            <p className="hist-section-label">Notizen</p>
            <p className="hist-notes">{illness.notes}</p>
          </div>
        )}
      </Glass>
    </ScrollPane>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────

export default function HistoryTab() {
  const [illnesses,    setIllnesses]    = useState<Illness[]>([])
  const [medications,  setMedications]  = useState<Medication[]>([])
  const [selected,     setSelected]     = useState<Illness | null>(null)

  useEffect(() => {
    db.illnesses.orderBy('startDate').reverse().toArray().then(setIllnesses)
    db.medications.toArray().then(setMedications)
  }, [])

  if (selected) {
    return (
      <IllnessDetail
        illness={selected}
        medications={medications}
        onBack={() => setSelected(null)}
      />
    )
  }

  const past   = illnesses.filter(i => !!i.endDate)
  const active = illnesses.find(i => !i.endDate)

  return (
    <ScrollPane className="history-page">

      {/* Active illness quick-link */}
      {active && (
        <>
          <p className="section-label">Aktuell aktiv</p>
          <IllnessRow
            illness={active}
            onClick={() => setSelected(active)}
            highlight
          />
        </>
      )}

      {/* Past illnesses */}
      <p className="section-label">
        Vergangene Erkrankungen
        {past.length > 0 && <span className="hist-count">({past.length})</span>}
      </p>

      {past.length === 0 ? (
        <div className="hist-empty">
          <span className="hist-empty__icon">📋</span>
          <p className="hist-empty__text">Noch keine abgeschlossenen Erkrankungen</p>
        </div>
      ) : (
        <div className="hist-list anim-stagger">
          {past.map(ill => (
            <IllnessRow
              key={ill.id}
              illness={ill}
              onClick={() => setSelected(ill)}
            />
          ))}
        </div>
      )}
    </ScrollPane>
  )
}

// ─── Row component ────────────────────────────────────────────────────────────

function IllnessRow({
  illness,
  onClick,
  highlight = false,
}: {
  illness:    Illness
  onClick:    () => void
  highlight?: boolean
}) {
  const days = durationDays(illness.startDate, illness.endDate)

  return (
    <Glass
      className={`hist-row glass--interactive ${highlight ? 'hist-row--active' : ''}`}
      onClick={onClick}
    >
      <span className="hist-row__emoji">{TYPE_EMOJI[illness.type] ?? '🏥'}</span>
      <div className="hist-row__info">
        <span className="hist-row__type">{illness.type}</span>
        <span className="hist-row__meta">
          {fmtDate(illness.startDate)} · {days} Tag{days !== 1 ? 'e' : ''}
        </span>
        {illness.symptoms.length > 0 && (
          <div className="hist-row__symptoms">
            {illness.symptoms.slice(0, 3).map(s => (
              <span key={s} className="hist-row__sym-tag">{s}</span>
            ))}
            {illness.symptoms.length > 3 && (
              <span className="hist-row__sym-tag">+{illness.symptoms.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <ChevronRight size={15} className="hist-row__chevron" />
    </Glass>
  )
}
