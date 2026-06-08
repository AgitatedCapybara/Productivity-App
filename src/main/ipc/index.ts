import { registerTaskHandlers } from './tasks.ipc'
import { registerProjectHandlers } from './projects.ipc'
import { registerHabitHandlers } from './habits.ipc'
import { registerWindowHandlers } from './window.ipc'
import { registerSessionHandlers } from './sessions.ipc'

export function registerAllHandlers() {
  registerTaskHandlers()
  registerProjectHandlers()
  registerHabitHandlers()
  registerSessionHandlers()
}

export { registerWindowHandlers }
