import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { OverlayPanel } from './OverlayPanel.tsx'
import '../src/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <OverlayPanel />
  </StrictMode>
)
