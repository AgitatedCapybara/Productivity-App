import { registerTaskHandlers } from './tasks.ipc'
import { registerProjectHandlers } from './projects.ipc'
import { registerHabitHandlers } from './habits.ipc'
import { registerWindowHandlers } from './window.ipc'
import { registerSessionHandlers } from './sessions.ipc'
import { registerSettingsHandlers } from './settings.ipc'

export function registerAllHandlers() {
  registerTaskHandlers()
  registerProjectHandlers()
  registerHabitHandlers()
  registerSessionHandlers()
  registerSettingsHandlers()
}

export { registerWindowHandlers }
