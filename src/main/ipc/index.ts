import { registerTaskHandlers } from './tasks.ipc'
import { registerProjectHandlers } from './projects.ipc'
import { registerHabitHandlers } from './habits.ipc'
import { registerWindowHandlers } from './window.ipc'
import { registerSessionHandlers } from './sessions.ipc'
import { registerSettingsHandlers } from './settings.ipc'
import { registerEventHandlers } from './events.ipc'
import { registerCircleHandlers } from './circle.ipc'
import { registerSearchHandlers } from './search.ipc'
import { registerPerfHandlers } from './perf.ipc'
import { registerTemplateHandlers } from './templates.ipc'
import { registerSchedulerHandlers } from './scheduler.ipc'
import { registerRitualHandlers } from './rituals.ipc'
import { registerWellnessHandlers } from './wellness.ipc'
import { registerNotesHandlers } from './notes.ipc'
import { registerViewsHandlers } from './views.ipc'
import { registerBackupHandlers } from './backup.ipc'
import { registerLicenseHandlers } from './license.ipc'
import { registerExportHandlers } from './export.ipc'

export function registerAllHandlers(): void {
  registerTaskHandlers()
  registerProjectHandlers()
  registerHabitHandlers()
  registerSessionHandlers()
  registerSettingsHandlers()
  registerEventHandlers()
  registerCircleHandlers()
  registerSearchHandlers()
  registerPerfHandlers()
  registerTemplateHandlers()
  registerSchedulerHandlers()
  registerRitualHandlers()
  registerWellnessHandlers()
  registerNotesHandlers()
  registerViewsHandlers()
  registerBackupHandlers()
  registerLicenseHandlers()
  registerExportHandlers()
}

export { registerWindowHandlers }

