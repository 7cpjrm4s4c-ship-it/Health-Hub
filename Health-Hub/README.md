# Health Hub

Persönlicher Health Data Hub – PWA für iOS Safari.

## Tech Stack

| Layer       | Technologie                  |
|-------------|------------------------------|
| Framework   | React 18 + TypeScript        |
| Build       | Vite 6                       |
| State       | Zustand 5                    |
| Datenbank   | Dexie.js 4 (IndexedDB)       |
| Styling     | Pure CSS + Custom Properties |
| PWA         | vite-plugin-pwa + Workbox    |
| Deploy      | GitHub Pages via Actions     |

---

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # → /dist
npm run preview   # Build lokal testen
```

---

## GitHub Pages Deployment

In `.github/workflows/deploy.yml` den Repo-Namen setzen:
```yaml
VITE_BASE_PATH: /DEIN-REPO-NAME/
```

Repository → Settings → Pages → Source: **GitHub Actions** → Push auf `main`.

---

## Shortcuts Bridge (Apple Health → App)

1. App → ☰ → 🔗 Shortcuts Bridge → Sync-URL kopieren
2. iOS Kurzbefehle → Neue Automatisierung → täglich → URL öffnen

**URL-Format:**
```
https://DOMAIN/health-hub/?hh_sync=TOKEN&date=YYYY-MM-DD
  &rhr=58&hrv=48&sleep=7.5&steps=8400&spo2=98&temp=36.8
```

Kein Server. Token-Validierung client-seitig. Daten in IndexedDB.

---

## Performance-Optimierungen

| Optimierung | Datei |
|---|---|
| rAF Throttle + latestYRef | `ScrollPane.tsx` |
| GPU-only Header Hide | `Header.tsx/css` |
| PillNav sliding highlight (zero reflow) | `PillNav.tsx/css` |
| `will-change` nur während Transition | `Header.tsx`, `PillNav.tsx` |
| Today eager, alle anderen lazy | `App.tsx` |
| Calendar + Analysis keepMounted | `App.tsx/css` |
| Recharts im eigenen Lazy Chunk | `AnalysisCharts.tsx` |
| `touch-action: pan-y` | `reset.css` |
| `contain: strict` auf hidden tabs | `App.css` |
| `100dvh` mit `100vh` Fallback | `reset.css` |
| Seed Race-Condition Guard | `App.tsx` |
| Sync URL sessionStorage Dedup | `App.tsx` |

---

## iOS Safari Edge Cases

| Problem | Lösung |
|---|---|
| `window.scrollY = 0` in PWA | `.scroll-container` mit Element-Scroll |
| Auto-Zoom auf Inputs | ≥16px font-size |
| URL-Bar collapse | `100dvh` (mit `100vh` Fallback) |
| IndexedDB Purge | Theme in `localStorage` gespiegelt |
| Sync URL Restore (BFCache) | `sessionStorage` Dedup-Guard |
| StrictMode / Hot Reload Seed | `pending` Lock + `seeding.current` Ref |

---

## Module

| # | Status | Inhalt |
|---|--------|--------|
| 1 | ✅ | Foundation, Design System, App Shell |
| 2 | ✅ | Heute-Tab, Score, Widget Grid, Dateneingabe |
| 3 | ✅ | Kalender-Tab, Wochenstrip, Timeline |
| 4 | ✅ | Krank-Tab, Fieberkurve, Symptome |
| 5 | ✅ | Analyse + Verlauf, Korrelationen |
| 6 | ✅ | Shortcuts Bridge, Apple Health Import |
