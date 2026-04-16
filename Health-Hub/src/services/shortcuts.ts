/**
 * Shortcuts Bridge Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture:
 *
 *  iOS Shortcut (Apple Health)
 *    → reads daily health samples
 *    → opens app URL with data in query params:
 *      https://YOUR-DOMAIN/health-hub/?hh_sync=TOKEN&date=YYYY-MM-DD
 *        &rhr=58&hrv=48&sleep=7.5&steps=8400&spo2=98&temp=36.8
 *
 *  App startup (App.tsx)
 *    → calls processSyncURL() which:
 *        1. Reads + validates query params
 *        2. Checks token matches stored token
 *        3. Writes HealthEvents to Dexie with source='shortcut'
 *        4. Triggers baseline recalculation
 *        5. Cleans URL via history.replaceState (no sensitive data in history)
 *        6. Returns import summary for toast display
 *
 * Privacy:
 *  - Token never leaves the device (validated client-side only)
 *  - No server involved – all data stays in IndexedDB
 *  - URL params are cleared immediately after processing
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, newId, type EventType } from '../db'

// ─── Token management ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'hh_bridge_token'

export function getBridgeToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function generateBridgeToken(): string {
  const arr = new Uint8Array(20)
  crypto.getRandomValues(arr)
  const token = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
  localStorage.setItem(TOKEN_KEY, token)
  return token
}

export function clearBridgeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ─── Sync URL builder (for display in the Setup Wizard) ─────────────────────

export function buildShortcutURL(baseURL: string, token: string): string {
  // The Shortcut will dynamically append health values, but the template is:
  return `${baseURL}?hh_sync=${token}&date=DATE&rhr=RHR&hrv=HRV&sleep=SLEEP&steps=STEPS&spo2=SPO2&temp=TEMP`
}

// ─── Sync result ─────────────────────────────────────────────────────────────

export interface SyncResult {
  success:   boolean
  imported:  number        // number of data points written
  date:      string        // YYYY-MM-DD of imported data
  error?:    string
}

// ─── Main entry point: called on app startup ─────────────────────────────────

export async function processSyncURL(): Promise<SyncResult | null> {
  const params = new URLSearchParams(window.location.search)
  const token  = params.get('hh_sync')

  // No sync params present → normal launch
  if (!token) return null

  // Always clean URL immediately (privacy: don't keep data in browser history)
  const cleanURL = window.location.pathname
  history.replaceState(null, '', cleanURL)

  // Validate token
  const stored = getBridgeToken()
  if (!stored || token !== stored) {
    return { success: false, imported: 0, date: '', error: 'Ungültiger Token' }
  }

  const date     = params.get('date') ?? new Date().toISOString().slice(0, 10)
  const baseDate = new Date(`${date}T12:00:00`)   // noon of the import day

  const fields: Array<{ param: string; type: EventType; unit: string; label: string }> = [
    { param: 'rhr',   type: 'resting_heart_rate', unit: 'bpm', label: 'Ruhepuls'   },
    { param: 'hrv',   type: 'hrv',                unit: 'ms',  label: 'HRV'        },
    { param: 'sleep', type: 'sleep',              unit: 'h',   label: 'Schlaf'     },
    { param: 'steps', type: 'steps',              unit: '',    label: 'Schritte'   },
    { param: 'spo2',  type: 'spo2',               unit: '%',   label: 'SpO₂'       },
    { param: 'temp',  type: 'temperature',        unit: '°C',  label: 'Temperatur' },
  ]

  let imported = 0

  for (const { param, type, unit } of fields) {
    const raw = params.get(param)
    if (!raw) continue
    const value = parseFloat(raw)
    if (isNaN(value)) continue

    // Skip if we already have a 'shortcut' entry for this type on this date
    const existing = await db.events
      .where('timestamp').between(startOfDay(baseDate), endOfDay(baseDate), true, true)
      .and(e => e.type === type && e.source === 'shortcut')
      .first()

    if (existing) {
      // Update value if re-syncing same day
      await db.events.update(existing.id, { value, timestamp: baseDate })
    } else {
      await db.events.add({
        id: newId(), type, value, unit,
        timestamp: baseDate,
        source: 'shortcut',
      })
    }
    imported++
  }

  return { success: true, imported, date }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0,  0,  0,   0); return r }
function endOfDay  (d: Date): Date { const r = new Date(d); r.setHours(23, 59, 59, 999); return r }
