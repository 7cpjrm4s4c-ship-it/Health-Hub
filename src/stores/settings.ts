import { create } from 'zustand'
import { db, newId, SETTINGS_KEYS } from '../db'

export type WidgetId = 'sleep' | 'resting_hr' | 'hrv' | 'temperature' | 'steps' | 'spo2'

export interface WidgetConfig {
  id:      WidgetId
  visible: boolean
  order:   number
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'sleep',       visible: true, order: 0 },
  { id: 'resting_hr',  visible: true, order: 1 },
  { id: 'hrv',         visible: true, order: 2 },
  { id: 'temperature', visible: true, order: 3 },
  { id: 'steps',       visible: true, order: 4 },
  { id: 'spo2',        visible: true, order: 5 },
]

interface SettingsState {
  widgets:   WidgetConfig[]
  init:      () => Promise<void>
  setWidgets: (w: WidgetConfig[]) => Promise<void>
  toggleWidget: (id: WidgetId) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  widgets: DEFAULT_WIDGETS,

  init: async () => {
    const row = await db.settings.get(SETTINGS_KEYS.WIDGET_ORDER)
    set({ widgets: (row?.value as WidgetConfig[] | undefined) ?? DEFAULT_WIDGETS })
  },

  setWidgets: async (w) => {
    set({ widgets: w })
    await db.settings.put({ key: SETTINGS_KEYS.WIDGET_ORDER, value: w })
  },

  toggleWidget: async (id) => {
    const updated = get().widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    await get().setWidgets(updated)
  },
}))

// ─── Demo seed ────────────────────────────────────────────────────────────────

export async function seedDemoData(): Promise<void> {
  const now   = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  const d = (offsetDays: number, h: number, m = 0): Date => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() + offsetDays)
    dt.setHours(h, m, 0, 0)
    return dt
  }

  await db.medications.bulkAdd([
    { id: newId(), name: 'Ibuprofen',  dosage: '400', unit: 'mg',  regular: false, schedule: ['08:00','14:00','20:00'], createdAt: now },
    { id: newId(), name: 'Sinupret',   dosage: '1',   unit: 'Tbl', regular: false, schedule: ['08:00','20:00'],         createdAt: now },
    { id: newId(), name: 'Vitamin D3', dosage: '2000',unit: 'IE',  regular: true,  schedule: ['08:00'],                 createdAt: now },
    { id: newId(), name: 'Magnesium',  dosage: '300', unit: 'mg',  regular: true,  schedule: ['20:00'],                 createdAt: now },
  ])

  const events = []
  for (let i = -6; i <= 0; i++) {
    const sick = i >= -3
    events.push({ id: newId(), type: 'sleep'              as const, value: sick ? 6.5 + Math.random()*0.5 : 7.2 + Math.random()*0.8, unit: 'h',   timestamp: d(i,7),  source: 'manual' as const })
    events.push({ id: newId(), type: 'resting_heart_rate' as const, value: sick ? 62 + Math.round(Math.random()*4) : 56 + Math.round(Math.random()*4), unit: 'bpm', timestamp: d(i,8),  source: 'manual' as const })
    events.push({ id: newId(), type: 'hrv'                as const, value: sick ? 42 + Math.round(Math.random()*6) : 54 + Math.round(Math.random()*8), unit: 'ms',  timestamp: d(i,8),  source: 'manual' as const })
    events.push({ id: newId(), type: 'steps'              as const, value: sick ? 3000 + Math.round(Math.random()*2000) : 7000 + Math.round(Math.random()*3000), unit: '', timestamp: d(i,20), source: 'manual' as const })
    events.push({ id: newId(), type: 'temperature'        as const, value: sick ? 37.8 + Math.random()*0.6 : 36.6 + Math.random()*0.2, unit: '°C', timestamp: d(i,10), source: 'manual' as const })
    events.push({ id: newId(), type: 'spo2'               as const, value: 97 + Math.round(Math.random()*2), unit: '%', timestamp: d(i,9), source: 'manual' as const })
    if (sick) events.push({ id: newId(), type: 'medication' as const, value: 'Ibuprofen 400mg', unit: '', timestamp: d(i,8), source: 'manual' as const, meta: { dosage: 400 } })
  }
  await db.events.bulkAdd(events)

  await db.illnesses.add({ id: newId(), type: 'Erkältung', startDate: d(-2,8), symptoms: ['Husten','Schnupfen','Halsschmerzen','Müdigkeit'], medicationIds: [], createdAt: d(-2,8) })

  for (const p of [
    { type: 'Grippe',    start: new Date('2025-11-03'), end: new Date('2025-11-08'), symptoms: ['Fieber','Gliederschmerzen','Erschöpfung'] },
    { type: 'Magen-Darm',start: new Date('2025-09-14'), end: new Date('2025-09-17'), symptoms: ['Übelkeit','Erbrechen'] },
    { type: 'Erkältung', start: new Date('2025-06-05'), end: new Date('2025-06-09'), symptoms: ['Schnupfen','Husten'] },
  ]) {
    await db.illnesses.add({ id: newId(), type: p.type, startDate: p.start, endDate: p.end, symptoms: p.symptoms, medicationIds: [], createdAt: p.start })
  }
}
