# Project Handoff Document
## Windows 11 Productivity App — Complete Context for New Owner
*Generated: 2026-06-04 · Status: Phase 1 Complete*

---

## 1. Executive Summary

A solo developer is building a Windows 11 desktop productivity app called **"Echoes"** (named by Gemini during scaffolding — not officially decided). The app combines the best features of Echo (distraction logging + accountability), TickTick (feature richness), and Todoist (clean UX) into one native desktop application.

The project has just **completed Phase 1** (the foundational shell). The app launches, the window opens, React renders, the UI is live, the SQLite database layer is wired up, and task CRUD functionality works successfully end-to-end. There are currently no blocking errors. 

The developer is an intermediate solo developer with a full-stack web/TypeScript background. All coding assistance uses **Gemini 3.1 Pro Preview in Google AI Studio** for code generation. This document provides everything needed to continue from where things left off.

---

## 2. Project Background and Objectives

### 2.1 Origin
The project started on 2026-05-30. The developer wanted to build a Windows 11 productivity app that unified features from three market leaders that no single app currently provides together:
- **Echo** — distraction logging and session-based accountability
- **TickTick** — all-in-one tasks + habits + calendar + Pomodoro
- **Todoist** — cleanest UX, best NLP date parsing

### 2.2 The Core Problem Being Solved
No existing app connects all four pillars: task management, focus timer that knows what you're working on, distraction tracking, and social accountability. Users currently need 2-3 separate apps. This project builds all four into one Windows-native desktop app.

### 2.3 AI Workflow Used
This project uses a 4-stage AI research pipeline:
- **Stage 1 (Claude Sonnet 4.6):** Fills a research brief template
- **Stage 2 (Gemini Deep Research):** Web research on frameworks and features
- **Stage 3A (Claude Sonnet 4.6):** Architecture audit with weighted scoring
- **Stage 3B (Gemini AI Studio):** Generates the planning document
- **Coding:** Gemini 3.1 Pro Preview in AI Studio generates code from the plan

The developer intentionally does NOT use the Gemini VS Code plugin (reported as poor quality) or GitHub Copilot. All code generation happens in Google AI Studio with context built up across the conversation.

### 2.4 Project Name
The app has been referred to as "Echoes Productivity" (from Gemini's scaffolding). No final app name has been decided. The tray tooltip currently says `'Echoes Productivity'` in `electron/main.ts`.

### 2.5 Developer Machine Specs (Critical)
- **OS:** Windows 11 ARM64 (Snapdragon/ARM processor — a Copilot+ PC)
- **Node.js:** v24.16.0
- **Architecture:** win32/arm64 — ALL native modules must be compiled for ARM64

---

## 3. Complete Conversation Summary

### Phase 1: Research and Planning (2026-05-30)
The developer uploaded a 4-stage research workflow (originally built for product research) and asked Claude to adapt it for app development. Claude received documents: `Foundational_Info.md`, `Workflow_Report.md`, `Prompt1.md`, `Prompt2.md`, `Prompt3.md`.

Claude adapted the prompts:
- `Adapted_Prompt1.md` — Research brief for the app
- `Adapted_Prompt2.md` — Architecture audit engine
- `Adapted_Prompt3.md` — Plan generator

### Phase 2: Deep Research (2026-05-30)
Gemini Deep Research ran the adapted research brief and produced `Report.md` — a comprehensive analysis of 8 desktop frameworks (Electron, Tauri v2, Wails v3, WinUI 3, WPF, Avalonia, Compose Multiplatform, React Native Windows) and their suitability for the app's requirements.

### Phase 3: Architecture Audit (2026-05-30)
Claude ran a 7-phase audit on `Report.md`:
1. Define Terms (focus areas, weights, candidates)
2. Calibrate (benchmarks, sponsorship bias sources)
3. Source Verification (tier 1/2/3 classification, disqualifications)
4. Multi-Path Consistency Check (3 paths, partial consensus)
5. Gap Analysis (3 critical gaps found — sync backend, UI library comparison, NLP)
6. Bias Audit (7 checks, minor flags)
7. Weighted Scoring Matrix (final scores)

**Audit result:** Electron 8.4/10 → WinUI 3 8.3/10 → Tauri v2 7.9/10. Confidence: 5.7/10 (gaps noted).

### Phase 4: Additional Research (2026-05-31)
Claude ran targeted web searches to fill the 3 confidence gaps:
- **PocketBase** confirmed as sync backend winner for Circle feature
- **React + Motion (Framer Motion) + DnD Kit** confirmed as UI library stack
- **chrono-node** confirmed as NLP date parsing library

### Phase 5: Competitor Deep-Dive (2026-05-31)
Claude researched what specifically made Echo/TickTick/Todoist good and what they're missing. Key findings documented in master plan Section 3.

### Phase 6: Framework Decision (2026-05-31)
**Electron chosen over Tauri v2.** Full rationale in `App_Master_Plan.md` Section 9. 

### Phase 7: Full Feature Plan (2026-05-31)
Complete 6-module feature plan created: Task Management, Focus Timer Widget, Circle (social), Habit Tracker, Analytics, Windows 11 Integration. 7-phase build roadmap defined.

### Phase 8: Gemini Coding Prompts Created (2026-05-31)
`Gemini_Coding_Prompts.md` created with System instruction and Prompts 1A through 1G.

### Phase 9: Project Setup and Phase 1 Build (2026-06-01 to 2026-06-04)
The developer resolved framework tooling issues, template mismatch issues, and file structure discrepancies, finally achieving a completely working Phase 1 architecture ready for Phase 2 tasks.

---

## 4. Key Decisions and Rationale

### 4.1 Framework: Electron (not Tauri v2)
**Decision:** Electron v33.4.11
**Rationale:**
- `active-win` npm package for distraction logging = 30 minutes of work. Tauri equivalent = days of Rust.
- BrowserWindow `alwaysOnTop: true` = 2 properties, 10 years of documentation
- `better-sqlite3` npm = `npm install`, TypeScript, synchronous, massive community
- All UI libraries (Motion, DnD Kit, shadcn/ui, chrono-node) are npm packages
- Measured single-window RAM: Electron ~93MB vs Tauri ~154MB
- Tauri migration path preserved: entire frontend stack is renderer code that runs identically in Tauri

### 4.2 Template: vite-plugin-electron (not electron-vite package)
**Decision:** The `npm create electron-vite` command scaffolded a `vite-plugin-electron` template. Reconciled output structures:
- Config: `vite.config.ts` (not `electron.vite.config.ts`)
- Main process: `electron/` folder (not `src/main/`)
- Renderer: `src/renderer/src/`

### 4.3 UI Stack: React + Motion v12 + DnD Kit
- React 19 wins on ecosystem depth for solo developer.
- Motion v12. Package name on npm: `motion`. Import: `from 'motion/react'`.
- DnD Kit for sortable lists.

### 4.4 Database: SQLite + better-sqlite3
- WAL mode enabled: `db.pragma('journal_mode = WAL')`
- busy_timeout: `db.pragma('busy_timeout = 5000')`
- Connection lives ONLY in the Electron main process (`electron/db/database.ts`)

### 4.5 Sync Backend: PocketBase
- Shared hosted instance (developer's server) as default.
- Custom URL in Settings.

### 4.6 IPC Pattern: invoke/handle (Promise-based)
All IPC uses `ipcRenderer.invoke` / `ipcMain.handle`.

### 4.7 shadcn/ui initialization: Manual (not CLI)
Tailwind v4 configuration required manual component setup.

---

## 5. Research Conducted and Findings

### 5.1 Framework Audit (8 frameworks scored)
Electron scored highest due to DX, npm package ecosystem, and ease of distraction logging.

### 5.2 Competitor Analysis Findings
- **TickTick** excels at features but pomodoro is disconnected from tasks.
- **Todoist** is clean but has weak time/accountability tools.
- **Echo** monitors tasks well but lacks generalized task management.
Universal Gap: No existing app unites a native-feeling UI with full tasks and reliable distraction monitoring.

### 5.3 Technology Research Findings
- **PocketBase** is lightweight, flexible, easy to self-host.
- **chrono-node** excels for NLP dates.
- **SQLite WAL mode** ensures performance across dual Electron windows.

---

## 6. Proposed Strategy and Implementation Plan

### 6.1 Seven Build Phases
| Phase | Version | What Gets Built |
|---|---|---|
| Phase 1 | v0.1 | Core shell: Electron + React + SQLite + basic task CRUD + tray + hotkey (COMPLETE) |
| Phase 2 | v0.2 | Full task management: NLP, DnD, recurring tasks, projects, views (NEXT) |
| Phase 3 | v0.3 | Focus timer widget: always-on-top, distraction logging, session timer |
| Phase 4 | v0.4 | Habit tracker: streaks, heatmap, bottom bar |
| Phase 5 | v0.5 | Analytics: focus charts, distraction breakdown, focus score |
| Phase 6 | v0.6 | Circle: PocketBase, friend feed, real-time presence |
| Phase 7 | v1.0 | Polish: MSIX, onboarding, performance |

---

## 7. Work Completed to Date

### 7.1 Packages Installed
**Production dependencies:** `better-sqlite3`, `chrono-node`, `compromise`, `@dnd-kit/*`, `motion`, `zustand`, `pocketbase`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tailwindcss`, `react-router-dom`.
**Dev dependencies:** `@electron/rebuild`, `@tailwindcss/vite`.

### 7.2 Native Module Status
`better-sqlite3` compiled successfully for Electron ARM64. Must be rebuilt with `npx @electron/rebuild -f -w better-sqlite3` on uninstallation.

### 7.3 Phase 1 Milestones Achieved
- Transparent frameless Electron window setup with drag regions.
- SQLite IPC bridging functional. Tasks can be created, updated, loaded, and deleted.
- Window UI structure built: Sidebar, Header, QuickAdd, collapsible categorized sections.
- Animations via `motion/react` are fully operational.

---

## 8. Current Status

### 8.1 What Works
- `npm run dev` successfully launches the Electron window. ✓
- Context-aware drag and drop items logic. ✓
- SQLite database saves and retrieves tasks. ✓
- Tailwind CSS v4 variables mapped properly. ✓

### 8.2 What Does NOT Work Yet
- None in Phase 1 scope. Fully ready to move to Phase 2.

---

## 9. Outstanding Tasks and Prioritized Next Steps

### NEXT: Start Phase 2 (Task Management)
1. **Extend Schema:** Introduce `projects`, `sessions`, `distractions`, and `habits` tables, and expand `tasks` table columns. Develop a `user_version` PRAGMA migration scheme for SQLite.
2. **Standardize Task IDs:** Use `nanoid(8)` across the application for unified standard typing.
3. **Draft Context Menu Logic:** Wire up the UI context menus (Priority levels, Edit title).
4. **NLP Quick-Add Polish:** Map `chrono-node` logic rigorously in the `QuickAdd` submission to separate dates mapped onto the expanded task schema.

---

## 10. Risks, Constraints, and Dependencies

### 10.1 Hard Constraints
- **ARM64 Architecture**: Must be strictly targeted for any binary builds logic.

### 10.2 Technical Risks
| Risk | Severity | Mitigation |
|---|---|---|
| Active window monitoring | HIGH | Use `active-win` npm package, prototype standalone before Phase 3 UI |
| Electron memory creep | MEDIUM | Monitor in Phase 3; toggle always-on-top window visibility |
| PocketBase free tier limits | LOW | Railway/fly.io free tier |

### 10.3 Known Warnings (Non-Blocking)
- `@theme` unknown at rule in `src/index.css` is perfectly normal for Tailwind 4 inside VS Code.
- `@tailwindcss/vite` module declaration types may complain in strict setups, does not impact logic.

---

## 11. Open Questions and Unresolved Issues

1. **App name** — Currently placeholder "Echoes".
2. **Color scheme / accent color** — Currently Indigo on deep charcoal glassmorphism.
3. **Timer widget density** — Should we show the full queue or an ultra-minimal pip?
4. **Always-on-top Widget State Sync** — How should IPC events proxy reliably between both windows without flooding?
5. **Tray Icon Asset** — Needs an actual designer PNG/ICO for the tray tray icon (`resources/icon.png`).

---

## 12. Important Context, Assumptions, and Lessons Learned

1. **Never use `framer-motion`**: Always import `motion/react`.
2. **Ensure correct Template usage:** `vite-plugin-electron` template enforces standard Vite conventions unlike older legacy scaffolding tools. The renderer entry points are purely UI level logic. All OS events happen exclusively via preload boundaries.
3. **AI Persistence:** Gemini remembers prior generations. Feed iterative contexts gracefully. Re-remind strict architecture bounds on major context changes.

---

## 13. Recommended Actions for the Next Owner

1. **Test Phase 1 E2E**: Perform smoke testing on task creation and data layout sorting.
2. **Build Test Prototype for `active-win`**: Before writing UI logic for Phase 3, confirm the background watcher successfully operates locally on the Copilot+ Arm64 desktop.
3. **Initiate Schema Upgrade**: Begin drafting the `tasks:update` and backend migration changes to support recurring tasks natively.

---

## 14. Appendix

### A. IPC Channel Reference (Phase 1)
| Channel | Direction | Args | Returns |
|---|---|---|---|
| `tasks:getAll` | renderer → main | none | `Task[]` |
| `tasks:create` | renderer → main | `title: string` | `Task` |
| `tasks:toggle` | renderer → main | `id: string, completed: boolean` | `void` |
| `tasks:delete` | renderer → main | `id: string` | `void` |

### B. SQLite Schema (Phase 1)
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id       TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL
);
```

### C. SQLite Schema (Phase 2 Target)
```sql
tasks:          id, title, notes, project_id, priority, status, due_date, due_time,
                recurrence, sort_order, time_estimate_mins, time_logged_mins, ...
projects:       id, name, color, icon, sort_order, created_at
sessions:       id, task_id, started_at, ended_at, duration_mins, distraction_count, status
distractions:   id, session_id, app_name, window_title, started_at, ended_at, duration_ms
habits:         id, name, frequency, current_streak, longest_streak, created_at
```

### D. Known Working Commands
```powershell
# Run in dev mode
npm run dev

# Rebuild better-sqlite3 for Electron ARM64
npx @electron/rebuild -f -w better-sqlite3
```

*End of handoff document.*
