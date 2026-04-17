/**
 * Shortcuts Bridge Service
 *
 * Token-Strategie:
 * - Token wird vom User selbst festgelegt (z.B. "meingeheimespasswort")
 * - Kein automatisches Generieren → gleicher Token auf allen Geräten
 * - Token wird in localStorage gespeichert
 * - Shortcut muss nur einmal eingerichtet werden
 */

import { db, newId, type EventType } from '../db'

const TOKEN_KEY = 'hh_bridge_token'

// ─── Token management ─────────────────────────────────────────────────────────

export function getBridgeToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setBridgeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function clearBridgeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ─── URL builder ──────────────────────────────────────────────────────────────

export function buildShortcutURL(baseURL: string, token: string): string {
  const base = baseURL.endsWith('/') ? baseURL : baseURL + '/'
  return `${base}?hh_sync=${token}&date=DATE&rhr=RHR&hrv=HRV&sleep=SLEEP&steps=STEPS&spo2=SPO2&temp=TEMP`
}

// ─── Sync result ──────────────────────────────────────────────────────────────

export interface SyncResult {
  success:  boolean
  imported: number
  date:     string
  error?:   string
}

// ─── Main entry: called on app startup ───────────────────────────────────────

export async function processSyncURL(): Promise<SyncResult | null> {
  const params = new URLSearchParams(window.location.search)
  const token  = params.get('hh_sync')

  if (!token) return null

  // Clean URL immediately (privacy)
  history.replaceState(null, '', window.location.pathname)

  const stored = getBridgeToken()

  // iOS PWA and Safari have separate localStorage.
  // Strategy: if no token stored yet, accept and save the token from the URL.
  // If a token IS stored, it must match (prevents random URLs from importing).
  if (stored && token.trim().toLowerCase() !== stored.trim().toLowerCase()) {
    return { success: false, imported: 0, date: '', error: 'Ungültiger Token' }
  }

  // First sync: auto-save token from URL
  if (!stored) {
    setBridgeToken(token.trim())
  }

  const date     = params.get('date') ?? new Date().toISOString().slice(0, 10)
  const baseDate = new Date(`${date}T12:00:00`)

  const fields: Array<{ param: string; type: EventType; unit: string }> = [
    { param: 'rhr',   type: 'resting_heart_rate', unit: 'bpm' },
    { param: 'hrv',   type: 'hrv',                unit: 'ms'  },
    { param: 'sleep', type: 'sleep',              unit: 'h'   },
    { param: 'steps', type: 'steps',              unit: ''    },
    { param: 'spo2',  type: 'spo2',               unit: '%'   },
    { param: 'temp',  type: 'temperature',        unit: '°C'  },
  ]

  let imported = 0

  for (const { param, type, unit } of fields) {
    const raw   = params.get(param)
    if (!raw) continue
    // Take only the first value if multiple are returned (e.g. "99\n98" → 99)
    const first = raw.split(/[\n,;]/)[0].trim()
    const value = parseFloat(first)
    if (isNaN(value)) continue

    const existing = await db.events
      .where('timestamp').between(startOfDay(baseDate), endOfDay(baseDate), true, true)
      .and(e => e.type === type && e.source === 'shortcut')
      .first()

    if (existing) {
      await db.events.update(existing.id, { value, timestamp: baseDate })
    } else {
      await db.events.add({ id: newId(), type, value, unit, timestamp: baseDate, source: 'shortcut' })
    }
    imported++
  }

  return { success: true, imported, date }
}

function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0,  0,  0,   0); return r }
function endOfDay  (d: Date): Date { const r = new Date(d); r.setHours(23, 59, 59, 999); return r }
