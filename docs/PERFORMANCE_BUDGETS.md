# Keystone Performance Budgets

Keystone maintains severe local performance budgets. A web developer's daily orchestrator must never lag, stutter, or spin loading widgets.

---

## 1. Responsiveness Goals

| Metric | Target | Verification Method |
|:---|:---|:---|
| **App Cold Start** | `< 1.5s` | Time from process launch to fully interactive main view. Checked via `performance.now()` in main. |
| **View Switch** | `< 100ms` | Time to completely paint and animate incoming page views. Measured on view tab clicks. |
| **Task Creation** | `< 50ms` | Perceived time for a newly entered text task to reflect in local lists (employing immediate state updates). |
| **Search Query Paint** | `< 80ms` | Display of relevant matches as the user type-queries the local index. |
| **Database Transaction** | `< 4ms` | SQlite execution time over Write-Ahead Log (WAL) for task status edits. |

---

## 2. Bundle Size Budgets

- **Main Process Bundle**: `< 2.0 MB` (raw executable code + dependencies)
- **Renderer UI Bundle**: `< 3.0 MB` (bundled JS, stylesheets, and SVG vector matrices)

---

## 3. Maintenance Optimization

To preserve these constraints indefinitely:
1. **Always use SQLite WAL mode** to handle parallel read/write lanes without locking UI responsiveness.
2. **Lazy-render optional components** such as long histories, archives, and custom boards.
3. **Avoid heavy dependencies** on the UI thread. Any heavy NLP date parser (`chrono-node`) or search indexing lives within light modular wrappers.
