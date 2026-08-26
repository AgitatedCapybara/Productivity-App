# Keystone Accessibility (a11y) Verification Standards

Keystone aims for robust digital accessibility without adding intrusive widgets. Sane keyboard layouts and clear contrast choices benefit power users and disabled users alike.

---

## 1. Compliance Baseline

Keystone targets full compliance with **WCAG 2.1 AA** standards:
1. **Dynamic High-Contrast Palette**: No text or visual metadata should have a relative contrast lower than `4.5:1` against the target container background under regular view conditions, and `7.0:1` under high-contrast selections.
2. **Robust Focus Rings**: Every actionable interface element (inputs, checkmarks, sidebar categories, projects, action overlays) MUST feature a persistent, high-contrast outline (`focus-ring`) when navigated via keyboard `Tab` or directional bindings.
3. **No Mouse-Only Hidden Actions**: Actions that appear on hover (such as a task's rename or delete buttons) must either remain keyboard-tabbable or be fully accessible via the Command Bar (`Ctrl+K` list triggers) or native hotkeys.

---

## 2. Keyboard Navigation Flow Verification

Our exact keyboard controls are tested and hardened as follows:

| Action | Shortcut Trigger | Accessibility outcome |
|:---|:---|:---|
| **Filter Navigation** | `Tab` / `Shift+Tab` | Traverses active list columns and sidebar categories in standard top-left to bottom-right flow. |
| **Complete Task** | Select task + `Space` | Immediately toggles complete/incomplete state with screen-reader announcement. |
| **Command Center** | `Ctrl+K` | Transfers system focus immediately to the command input without mouse assistance. |
| **Shortcuts Palette** | `?` | Opens shortcut dictionary modal. Safe-trappable focus. Dismissible with `Esc` |
| **Direct Exit** | `Esc` | Safely dismisses active dialog overlays, modals, and dropdown components. |

---

## 3. Keyboard Focus Style Requirements

Avoid hiding default focus rings unless introducing custom, elegant styling overrides:

```css
/* Preferred custom Focus states in index.css */
*:focus-visible {
  outline: 2px solid var(--accent-primary) !important;
  outline-offset: 2px !important;
  background-color: var(--color-focus-bg) !important;
}
```
