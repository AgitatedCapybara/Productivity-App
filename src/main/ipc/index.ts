import { registerTaskHandlers } from './tasks.ipc'
import { registerProjectHandlers } from './projects.ipc'
import { registerHabitHandlers } from './habits.ipc'
import { registerWindowHandlers } from './window.ipc'
import { registerSessionHandlers } from './sessions.ipc'
import { registerSettingsHandlers } from './settings.ipc'
import { registerEventHandlers } from './events.ipc'
import { registerCircleHandlers } from './circle.ipc'

export function registerAllHandlers(): void {
  registerTaskHandlers()
  registerProjectHandlers()
  registerHabitHandlers()
  registerSessionHandlers()
  registerSettingsHandlers()
  registerEventHandlers()
  registerCircleHandlers()
}

export { registerWindowHandlers }

