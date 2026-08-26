# Keystone Motion and UI Restraint Guidelines

This document specifies the motion design system of Keystone. Unlike "SuperApps" (such as Motion or ClickUp) which feature bouncy spring animations, aggressive card-shaking, and high-frequency UI noise, Keystone prioritizes absolute cognitive calm and execution speed.

---

## 1. Core Principles

1. **State-Driven Only**: Animations are never decoration. They must only signal a transition between distinct logical states (e.g., adding an item, deleting a row, expanding a collapsed pane).
2. **Tempo Limit (Speed Budget)**: No micro-interaction or transition may exceed `200ms`. The application must feel instantaneous.
3. **No Bouncy Springs**: Avoid loose, jiggly spring physics (`stiffness` or `damping` that allows overshooting or oscillation). Overshooting causes visual fatigue.
4. **Respect Contrast & Reduced Motion**: Honoring `prefers-reduced-motion` to fully scale down or bypass animation transitions on the system level.

---

## 2. Timing and Curve Constants

When crafting transitions using `motion/react`, prefer the following rigid constants:

| Type | Duration | Timing Function / Easing | Best For |
|:---|:---|:---|:---|
| **Immediate Collapse** | `150ms` | `[0.2, 0.0, 0.0, 1.0]` (standard ease-out) | Collapsible cards, dropdown expansions. |
| **Micro-interaction** | `100ms` | `[0.4, 0.0, 0.2, 1.0]` (tight ease-in-out) | Hover highlights, state icons checkmark transitions. |
| **Fade In / Out** | `150ms` | `linear` or custom cubic | Modals overlay fade, toasts entrance. |
| **Page Swipe / Zoom** | `200ms` | `cubic-bezier(0.16, 1, 0.3, 1)` (smooth deceleration) | Main panel transitions or sidebar category drift. |

---

## 3. Implementation of `prefers-reduced-motion`

Always integrate native media query listeners or direct styling overrides to bypass complex translations:

```typescript
// Example React usage
import { m, useReducedMotion } from 'motion/react'

export function AnimatedRow({ children }) {
  const shouldReduceMotion = useReducedMotion()
  
  return (
    <motion.div
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}
```

Or globally override transitions in index.css:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }
}
```
