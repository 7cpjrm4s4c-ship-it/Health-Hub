import { create } from 'zustand'
import { db, todayKey, type DailyBaseline } from '../db'

interface BaselineState {
  today:     DailyBaseline | null
  history:   DailyBaseline[]   // last 30 days

  loadToday:   () => Promise<void>
  loadHistory: (days?: number) => Promise<void>
  recalculate: (dateKey?: string) => Promise<void>
}

export const useBaselineStore = create<BaselineState>((set) => ({
  today:   null,
  history: [],

  loadToday: async () => {
    const row = await db.baselines.get(todayKey())
    set({ today: row ?? null })
  },

  loadHistory: async (days = 30) => {
    const all = await db.baselines.toArray()
    const sorted = all
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days)
    set({ history: sorted })
  },

  recalculate: async (dateKey = todayKey()) => {
    const start = new Date(`${dateKey}T00:00:00`)
    const end   = new Date(`${dateKey}T23:59:59`)

    const events = await db.events
      .where('timestamp')
      .between(start, end, true, true)
      .toArray()

    // ── Extract latest value per type ──
    const latest = <T extends number | string>(type: string): T | undefined => {
      const matches = events
        .filter((e) => e.type === type)
        .sort((a, b) => +b.timestamp - +a.timestamp)
      return matches[0]?.value as T | undefined
    }

    const restingHR   = numOrUndef(latest('resting_heart_rate'))
    const avgHRV      = numOrUndef(latest('hrv'))
    const sleepHours  = numOrUndef(latest('sleep'))
    const steps       = numOrUndef(latest('steps'))
    const temperature = numOrUndef(latest('temperature'))
    const spo2        = numOrUndef(latest('spo2'))

    const score = calculateScore({ restingHR, avgHRV, sleepHours, steps, temperature })

    const baseline: DailyBaseline = {
      date: dateKey,
      restingHR,
      avgHRV,
      sleepHours,
      steps,
      temperature,
      spo2,
      score,
      calculatedAt: new Date(),
    }

    await db.baselines.put(baseline)

    if (dateKey === todayKey()) {
      set({ today: baseline })
    }
  },
}))

// ─── Score Algorithm ──────────────────────────────────────────────────────────
//
//  Weighted average of available signals.
//  Missing signals are excluded from the weight total so the score
//  reflects only what we actually know.
//
//  Weights:
//    Sleep        30%
//    HRV          25%
//    Resting HR   20%
//    Steps        15%
//    Temperature  10%
//

interface ScoreInput {
  sleepHours?:  number
  avgHRV?:      number
  restingHR?:   number
  steps?:       number
  temperature?: number
}

export function calculateScore(input: ScoreInput): number {
  const signals: Array<{ weight: number; score: number }> = []

  if (input.sleepHours !== undefined) {
    signals.push({ weight: 0.30, score: scoreSleep(input.sleepHours) })
  }
  if (input.avgHRV !== undefined) {
    signals.push({ weight: 0.25, score: scoreHRV(input.avgHRV) })
  }
  if (input.restingHR !== undefined) {
    signals.push({ weight: 0.20, score: scoreHR(input.restingHR) })
  }
  if (input.steps !== undefined) {
    signals.push({ weight: 0.15, score: scoreSteps(input.steps) })
  }
  if (input.temperature !== undefined) {
    signals.push({ weight: 0.10, score: scoreTemp(input.temperature) })
  }

  if (signals.length === 0) return 0

  const totalWeight = signals.reduce((s, x) => s + x.weight, 0)
  const weightedSum = signals.reduce((s, x) => s + x.weight * x.score, 0)
  return Math.round(weightedSum / totalWeight)
}

// ── Individual signal scorers (0–100) ────────────────────────────────────────

function scoreSleep(h: number): number {
  if (h >= 7 && h <= 9) return 100
  if (h >= 6 && h < 7)  return 75
  if (h >= 9 && h < 10) return 85
  if (h >= 5 && h < 6)  return 45
  return 20
}

function scoreHRV(ms: number): number {
  // Higher HRV = better recovery
  if (ms >= 60) return 100
  if (ms >= 50) return 85
  if (ms >= 40) return 70
  if (ms >= 30) return 50
  return 30
}

function scoreHR(bpm: number): number {
  // Lower resting HR = better cardiovascular fitness / recovery
  if (bpm <= 60) return 100
  if (bpm <= 70) return 85
  if (bpm <= 80) return 65
  if (bpm <= 90) return 45
  return 25
}

function scoreSteps(s: number): number {
  if (s >= 10000) return 100
  if (s >= 7500)  return 80
  if (s >= 5000)  return 60
  if (s >= 2500)  return 40
  return 20
}

function scoreTemp(t: number): number {
  if (t < 37.5)  return 100
  if (t < 38.0)  return 70
  if (t < 38.5)  return 45
  if (t < 39.0)  return 25
  return 10
}

// ─── Score label ─────────────────────────────────────────────────────────────

export function scoreLabel(score: number): { text: string; emoji: string; color: string } {
  if (score >= 85) return { text: 'Sehr gut',       emoji: '✅', color: 'var(--c-green)'  }
  if (score >= 70) return { text: 'Gut',             emoji: '🟢', color: 'var(--c-green)'  }
  if (score >= 55) return { text: 'Leicht belastet', emoji: '⚡', color: 'var(--c-yellow)' }
  if (score >= 40) return { text: 'Belastet',        emoji: '⚠️', color: 'var(--c-yellow)' }
  return              { text: 'Stark belastet',   emoji: '🔴', color: 'var(--c-red)'    }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function numOrUndef(v: number | string | undefined): number | undefined {
  if (v === undefined) return undefined
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(n) ? undefined : n
}
