import { registerTaskHandlers } from './tasks.ipc'
import { registerProjectHandlers } from './projects.ipc'
import { registerHabitHandlers } from './habits.ipc'
import { registerWindowHandlers } from './window.ipc'

export function registerAllHandlers() {
  registerTaskHandlers()
  registerProjectHandlers()
  registerHabitHandlers()
}

export { registerWindowHandlers }
