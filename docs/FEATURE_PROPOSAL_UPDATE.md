# Keystone Feature Proposal Checklist (Anti-Bloat Guardian)

Keystone maintains its edge by intentionally saying **"No"** to features that add visual noise or cognitive friction. Every feature or view contribution MUST pass the anti-bloat rubric before implementation.

---

## 1. Rubric of Minimalism

1. **What direct, validated developer friction does this solve?**
   - *Example: Schedulers should sync without forcing users to register emails.*

2. **Can this be solved using an existing primitive?**
   - *Example: Instead of creating a "Special Project Task Priority Alarm View", can the user simple use the standard Priority 3 task flag scheduled in today's time blocks?*

3. **What is the precise UI surface area cost?**
   - Does it add persistent sidebar items?
   - Does it place new buttons on the main screen?
   - If added, does the default visible area for a new user remain completely blank, calm, and uncluttered?

4. **Can this be progressively disclosed?**
   - Can this configuration be tucked behind "Show advanced" options using our standard `Disclosure` module?
   - Can it be discovered exclusively via the Command Bar (`Ctrl+K`) without displaying physical buttons?

5. **Does this feature make Keystone feel like Motion, JIRA, or ClickUp?**
   - *If yes:* Reconsider or simplify immediately. We build software for focused individual work, not enterprise committee tracking.
