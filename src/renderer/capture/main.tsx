import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { Capture } from './Capture'
import '../src/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Capture />
  </StrictMode>
)
