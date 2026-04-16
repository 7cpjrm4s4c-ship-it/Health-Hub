import { create } from 'zustand'
import { db, newId, toDateKey, type HealthEvent, type Illness, type Medication, type EventType } from '../db'

interface HealthState {
  todayEvents:   HealthEvent[]
  dateEvents:    HealthEvent[]        // events for Calendar's active date
  activeIllness: Illness | null
  medications:   Medication[]
  loading:       boolean

  loadAll:              () => Promise<void>
  loadTodayEvents:      () => Promise<void>
  loadEventsForDate:    (date: Date) => Promise<void>
  loadActiveIllness:    () => Promise<void>
  loadMedications:      () => Promise<void>

  addEvent: (
    type:       EventType,
    value:      number | string,
    unit:       string,
    timestamp?: Date,
    meta?:      Record<string, unknown>
  ) => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  addMedication:    (m: Omit<Medication, 'id' | 'createdAt'>) => Promise<void>
  deleteMedication: (id: string) => Promise<void>

  startIllness: (type: string) => Promise<void>
  closeIllness: (id: string)   => Promise<void>
  addSymptom:   (id: string, symptom: string) => Promise<void>
}

export const useHealthStore = create<HealthState>((set, get) => ({
  todayEvents:   [],
  dateEvents:    [],
  activeIllness: null,
  medications:   [],
  loading:       false,

  loadAll: async () => {
    set({ loading: true })
    await Promise.all([
      get().loadTodayEvents(),
      get().loadActiveIllness(),
      get().loadMedications(),
    ])
    set({ loading: false })
  },

  loadTodayEvents: async () => {
    const events = await queryDay(new Date())
    set({ todayEvents: events })
  },

  loadEventsForDate: async (date) => {
    const events = await queryDay(date)
    set({ dateEvents: events })
  },

  loadActiveIllness: async () => {
    const all    = await db.illnesses.toArray()
    const active = all.find((i) => !i.endDate) ?? null
    set({ activeIllness: active })
  },

  loadMedications: async () => {
    const meds = await db.medications.orderBy('name').toArray()
    set({ medications: meds })
  },

  addEvent: async (type, value, unit, timestamp = new Date(), meta) => {
    const event: HealthEvent = { id: newId(), type, value, unit, timestamp, source: 'manual', meta }
    await db.events.add(event)
    // Reload both today and whatever date is currently open in Calendar
    await get().loadTodayEvents()
  },

  deleteEvent: async (id) => {
    await db.events.delete(id)
    await get().loadTodayEvents()
  },

  addMedication: async (m) => {
    await db.medications.add({ ...m, id: newId(), createdAt: new Date() })
    await get().loadMedications()
  },

  deleteMedication: async (id) => {
    await db.medications.delete(id)
    await get().loadMedications()
  },

  startIllness: async (type) => {
    await db.illnesses.add({
      id: newId(), type, startDate: new Date(),
      symptoms: [], medicationIds: [], createdAt: new Date(),
    })
    await get().loadActiveIllness()
  },

  closeIllness: async (id) => {
    await db.illnesses.update(id, { endDate: new Date() })
    await get().loadActiveIllness()
  },

  addSymptom: async (id, symptom) => {
    const illness = await db.illnesses.get(id)
    if (!illness || illness.symptoms.includes(symptom)) return
    await db.illnesses.update(id, { symptoms: [...illness.symptoms, symptom] })
    await get().loadActiveIllness()
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function queryDay(date: Date): Promise<HealthEvent[]> {
  return db.events
    .where('timestamp')
    .between(startOfDay(date), endOfDay(date), true, true)
    .sortBy('timestamp')
}

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0,  0,  0,   0); return r
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r
}

export { toDateKey }
