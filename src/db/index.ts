import Dexie, { type EntityTable } from 'dexie'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type EventType =
  | 'resting_heart_rate'
  | 'heart_rate'
  | 'hrv'
  | 'sleep'
  | 'steps'
  | 'temperature'
  | 'medication'
  | 'spo2'
  | 'weight'
  | 'blood_pressure'

export type EventSource = 'manual' | 'shortcut' | 'import'

export type Theme = 'dark' | 'light' | 'auto'

// ─── Entity Interfaces ────────────────────────────────────────────────────────

/**
 * Core data unit. Everything is a HealthEvent.
 * Dashboard, Calendar, Analysis all read from this table.
 */
export interface HealthEvent {
  id:        string
  type:      EventType
  value:     number | string
  unit:      string
  timestamp: Date
  source:    EventSource
  meta?:     Record<string, unknown>
}

/**
 * Medication catalog.
 * Entries here appear as suggestions when logging in the Calendar.
 */
export interface Medication {
  id:        string
  name:      string
  dosage:    string
  unit:      string
  regular:   boolean          // shown as auto-suggestion if true
  schedule?: string[]         // e.g. ['08:00', '20:00']
  notes?:    string
  createdAt: Date
}

/**
 * A single illness episode (Erkältung, Grippe, …).
 * endDate === undefined means currently active.
 */
export interface Illness {
  id:            string
  type:          string
  startDate:     Date
  endDate?:      Date
  symptoms:      string[]
  medicationIds: string[]
  notes?:        string
  createdAt:     Date
}

/**
 * Pre-computed daily summary.
 * Recalculated whenever new events arrive for that day.
 * Score: 0–100
 */
export interface DailyBaseline {
  date:          string    // 'YYYY-MM-DD'
  restingHR?:    number
  avgHRV?:       number
  sleepHours?:   number
  steps?:        number
  temperature?:  number
  spo2?:         number
  score:         number
  calculatedAt:  Date
}

/**
 * App-wide key/value settings store.
 * Keys defined in SETTINGS_KEYS constant below.
 */
export interface AppSettings {
  key:   string
  value: unknown
}

// ─── Settings Keys ────────────────────────────────────────────────────────────

export const SETTINGS_KEYS = {
  THEME:          'theme',
  WIDGET_ORDER:   'widgetOrder',
  WIDGET_VISIBLE: 'widgetVisible',
  SHORTCUT_TOKEN: 'shortcutToken',
  SEEDED:         'seeded',           // true after demo data is inserted
} as const

// ─── Database ─────────────────────────────────────────────────────────────────

export class HealthHubDB extends Dexie {
  events!:     EntityTable<HealthEvent,    'id'>
  medications!:EntityTable<Medication,    'id'>
  illnesses!:  EntityTable<Illness,       'id'>
  baselines!:  EntityTable<DailyBaseline, 'date'>
  settings!:   EntityTable<AppSettings,   'key'>

  constructor() {
    super('HealthHubDB')

    this.version(1).stores({
      // Indexed fields only (Dexie stores full objects automatically)
      events:      'id, type, timestamp',
      medications: 'id, name, regular',
      illnesses:   'id, type, startDate',
      baselines:   'date',
      settings:    'key',
    })
  }
}

export const db = new HealthHubDB()

// ─── ID Helper ────────────────────────────────────────────────────────────────

/** Generates a time-sortable unique ID without external dependencies */
export function newId(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID().split('-')[0]}`
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function todayKey(): string {
  return toDateKey(new Date())
}
