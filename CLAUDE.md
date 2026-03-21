# CLAUDE.md — WB4 Darts Training App

## Project Overview
WB4 is a mobile-first React darts training application. It helps players practice specific aspects of darts (doubles, triples, full games) with session tracking, analytics, and shareable results.

---

## Tech Stack
- **React 18** + **Vite 5** — UI framework and build tool
- **Zustand 4** — global state management (two stores)
- **Tailwind CSS 3** — utility-first styling
- **PostHog** — analytics/event tracking
- **html-to-image** — screenshot/share functionality
- **localStorage** — session persistence (no backend)

---

## Build & Run Commands
```bash
npm run dev       # Dev server with hot reload
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

---

## Project Structure
```
src/
├── App.jsx                    # Root component; routes between modes via currentMode
├── main.jsx                   # React entry point
├── index.css                  # Global styles (Tailwind imports + custom)
├── store/
│   └── gameStore.js           # Zustand stores: useSessionStore + useAppStore
├── utils/
│   ├── constants.js           # Mode definitions, board regions, gradients
│   ├── scoring.js             # 3-dart score validation (impossible scores list)
│   ├── statistics.js          # Per-mode stat calculations
│   ├── analytics.js           # PostHog integration (phc_VCFM7l2HP...)
│   ├── targeting.js           # Weighted random target generation
│   ├── heatmap.js             # Board region aggregation + confidence levels
│   └── hotrow.js              # Dynamic hot-row shortcuts (top 5 scoring patterns)
├── components/
│   ├── ui/
│   │   ├── MainMenu.jsx       # Home screen with mode categories
│   │   ├── ScoreInput.jsx     # 3-dart score keyboard input
│   │   ├── TargetDisplay.jsx  # Current target display
│   │   ├── HotRow.jsx         # Quick-tap score shortcuts
│   │   ├── StatCard.jsx       # Session stats display
│   │   ├── Button.jsx         # Reusable styled button
│   │   ├── ShareTile.jsx      # Screenshot + share via html-to-image
│   │   └── Overlay.jsx        # Modals (name prompt, saved notification)
│   └── modes/
│       ├── DoubleIn.jsx       # Drill: get in with any double
│       ├── DoubleOut.jsx      # Drill: checkout doubles (weighted targets)
│       ├── Triples.jsx        # Drill: cricket number triples
│       ├── First9.jsx         # Drill: first 9 turns of 501
│       ├── Cricket.jsx        # Full cricket game simulation
│       ├── Solo501.jsx        # Full 501 game simulation
│       ├── History.jsx        # Session history + JSON export/import
│       ├── Insights.jsx       # Analytics, heatmap, regional analysis
│       └── index.js           # Mode exports
```

---

## State Management
Two Zustand stores in `src/store/gameStore.js`:

**`useSessionStore`** — session history
- Two buckets: `repsSessions` (drills) + `soloSessions` (full games), max 100 each
- Methods: `loadSessions()`, `addSession()`, `clearSessions()`, `importSessions()`, `getSessionsByMode()`
- In-progress sessions saved to localStorage keys like `wb4_inprogress_double_in`

**`useAppStore`** — UI state + player identity
- Tracks `currentMode`, player name/team, save status messages
- Methods: `setMode()`, `setPlayerInfo()`, `loadPlayerInfo()`, `declineName()`, `clearPlayerInfo()`

---

## Training Modes

### Reps (Drills)
| Mode | Key | What it tests |
|------|-----|---------------|
| Double-In | `DI` | Getting in with any double |
| Double-Out | `DO` | Checkout doubles (weighted targets: 16, 8, 20, 10, 12, DB get 1.5x) |
| Triples | `TRIPS` | Cricket numbers (15–20 + Bull); Bull weighted lower (0.4x) |
| First-9 | `F9` | First 9 turns of 501 game |

### Solo (Full Games)
| Mode | Key | What it tracks |
|------|-----|----------------|
| Cricket | `CKT` | Marks per round (MPR), total throws |
| Solo 501 | `501` | Darts to finish, avg score per turn |

---

## Key Conventions & Patterns

**Score Validation** (`scoring.js`):
- Valid range: 0–180
- Impossible 3-dart scores rejected: `[179, 178, 176, 175, 173, 172, 169, 166, 163]`

**Targeting** (`targeting.js`):
- Weighted random selection; adaptive weighting increases priority doubles after failures

**Heatmap Confidence** (`heatmap.js`):
- "Solid" confidence requires 360+ total darts (90+ per board region)

**Hot Row** (`hotrow.js`):
- Shows top 5 frequently used scores; requires 50+ turns, 5+ appearances, 3%+ frequency

**Styling**:
- Dark theme: `#1a1a1a` / `#2d2d2d` backgrounds
- Gold gradient header: `linear-gradient(45deg, #ffd700, #ffed4a)`
- Tailwind utility classes throughout

---

## Darts Game Context

### Scoring Zones
- **Singles**: Each segment 1–20 scores face value
- **Doubles ring** (outer narrow ring): 2× the segment value; D20 = 40, DB (double bull) = 50
- **Trebles ring** (inner narrow ring): 3× the segment value; T20 = 60
- **Bull**: Inner bull (double bull) = 50; outer bull (single bull) = 25
- **Maximum score per turn (3 darts)**: 180 (T20, T20, T20)

### Game Formats Relevant to This App

**501 / Double-Out**
- Start at 501, subtract each turn's score
- Must finish exactly on a double (including double bull = 50)
- Must not "bust" (go below 0 or leave 1)
- "First-9" = first 3 turns (9 darts total); benchmark for pro players is ~100+ average

**501 / Straight-In (used here)**
- No double required to start; just score down from 501

**Cricket**
- Numbers in play: 15, 16, 17, 18, 19, 20, Bull
- Must hit each number 3 times to "close" it
- Singles = 1 mark, doubles = 2 marks, trebles = 3 marks
- Once closed, you score points on that number; opponent closes to stop scoring
- **MPR (Marks Per Round)**: standard performance metric (3 darts / turn); pro average ~3.5+

**Doubles Drill (Double-In / Double-Out)**
- A "double" is the thin outer ring; 20 doubles available + double bull
- Pro checkout percentages typically range 35–55% on their preferred doubles

### Checkout Doubles Priority (in this app)
The app weights these doubles higher for practice: **16, 8, 20, 10, 12, Double Bull**
- These are common finish targets on the pro tour

---

## Questions / Things to Know for Troubleshooting

1. **No backend** — all data is localStorage only; clearing browser storage wipes everything
2. **In-progress sessions** are auto-saved per mode; if a mode crashes mid-session the data is retained
3. **Share tile** (`ShareTile.jsx`) uses `html-to-image` to capture a DOM node as PNG — layout/styling issues can break the capture
4. **Analytics** is PostHog; it won't affect functionality if blocked
5. **Session buckets** are separate for reps vs solo modes — make sure `addSession()` is called with the correct mode string that maps to the right bucket
6. **Hot row** won't appear until 50+ turns have been logged across sessions
