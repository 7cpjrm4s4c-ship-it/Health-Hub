import { create } from 'zustand'
import { db, SETTINGS_KEYS, type Theme } from '../db'

export type TabId = 'today' | 'calendar' | 'illness' | 'analysis' | 'history'

// ─── Instant FOUC prevention ──────────────────────────────────────────────────
// Read theme from localStorage SYNCHRONOUSLY at module load time.
// This fires before the first React render, so no flash of wrong theme.
const LS_KEY = 'hh_theme'

function readThemeSync(): Theme {
  try {
    return (localStorage.getItem(LS_KEY) as Theme | null) ?? 'dark'
  } catch {
    return 'dark'
  }
}

function writeThemeSync(t: Theme) {
  try { localStorage.setItem(LS_KEY, t) } catch { /* private mode */ }
}

// Apply immediately at module load (before React mounts)
const initialTheme = readThemeSync()
applyThemeToDOM(initialTheme)

// ─── Store ────────────────────────────────────────────────────────────────────

interface UIState {
  activeTab:     TabId
  theme:         Theme
  headerHidden:  boolean
  settingsOpen:  boolean
  activeDate:    Date
  sheetOpen:     boolean
  sheetType:     string | null

  setActiveTab:     (tab: TabId)    => void
  setTheme:         (t: Theme)      => Promise<void>
  initTheme:        ()              => Promise<void>
  setHeaderHidden:  (v: boolean)    => void
  openSettings:     ()              => void
  closeSettings:    ()              => void
  setActiveDate:    (d: Date)       => void
  openSheet:        (type: string)  => void
  closeSheet:       ()              => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTab:    'today',
  theme:        initialTheme,
  headerHidden: false,
  settingsOpen: false,
  activeDate:   new Date(),
  sheetOpen:    false,
  sheetType:    null,

  // ── Tab navigation ──────────────────────────────────────────────────────
  setActiveTab: (tab) => set({ activeTab: tab, settingsOpen: false, headerHidden: false }),

  // ── Theme ───────────────────────────────────────────────────────────────
  setTheme: async (t) => {
    set({ theme: t })
    applyThemeToDOM(t)
    writeThemeSync(t)
    // Mirror to Dexie for cross-session persistence
    await db.settings.put({ key: SETTINGS_KEYS.THEME, value: t })
  },

  initTheme: async () => {
    // localStorage was already applied at module load.
    // Now verify with Dexie and resolve conflicts.
    try {
      const row = await db.settings.get(SETTINGS_KEYS.THEME)
      if (row?.value && row.value !== initialTheme) {
        const dbTheme = row.value as Theme
        set({ theme: dbTheme })
        applyThemeToDOM(dbTheme)
        writeThemeSync(dbTheme)
      }
    } catch { /* DB not ready yet – localStorage value is fine */ }
  },

  // ── Header visibility (updated by ScrollPane) ───────────────────────────
  setHeaderHidden: (v) => set({ headerHidden: v }),

  // ── Settings drawer ─────────────────────────────────────────────────────
  openSettings:  () => set({ settingsOpen: true  }),
  closeSettings: () => set({ settingsOpen: false }),

  // ── Active date (Calendar tab) ──────────────────────────────────────────
  setActiveDate: (d) => set({ activeDate: d }),

  // ── Bottom sheet ────────────────────────────────────────────────────────
  openSheet:  (type) => set({ sheetOpen: true,  sheetType: type }),
  closeSheet: ()     => set({ sheetOpen: false, sheetType: null }),
}))

// ─── DOM helper ───────────────────────────────────────────────────────────────

function applyThemeToDOM(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.theme = dark ? 'dark' : 'light'
  } else {
    root.dataset.theme = t
  }
}
